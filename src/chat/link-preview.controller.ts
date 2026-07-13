import { Controller, Get, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

@Controller('chat/link-preview')
@UseGuards(JwtAuthGuard)
export class LinkPreviewController {
  // ponytail: 인메모리 캐시 — 같은 링크 반복 조회 방지. 서버 재시작 시 초기화되면 그만
  private cache = new Map<string, { data: LinkPreview; at: number }>();
  private static readonly CACHE_TTL = 1000 * 60 * 60; // 1시간
  private static readonly MAX_BYTES = 512 * 1024; // HTML 512KB까지만 읽음

  @Get()
  async getPreview(@Query('url') url: string): Promise<{ success: boolean; data: LinkPreview | null }> {
    if (!url) throw new BadRequestException('url is required');

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new BadRequestException('invalid url');
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new BadRequestException('only http/https allowed');
    }
    // SSRF 가드: 내부망 주소 차단
    const host = parsed.hostname;
    if (
      host === 'localhost' ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
      host === '0.0.0.0' ||
      host === '[::1]'
    ) {
      throw new BadRequestException('blocked host');
    }

    const cached = this.cache.get(url);
    if (cached && Date.now() - cached.at < LinkPreviewController.CACHE_TTL) {
      return { success: true, data: cached.data };
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(url, {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          // 일부 사이트는 봇 UA에 OG 태그를 더 잘 내려줌
          'User-Agent': 'Mozilla/5.0 (compatible; SuChatBot/1.0; +link-preview)',
          Accept: 'text/html',
        },
      });
      clearTimeout(timer);

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) {
        return { success: true, data: null };
      }

      // 본문 일부만 읽기 (OG 태그는 <head>에 있음)
      const reader = res.body?.getReader();
      let html = '';
      if (reader) {
        const decoder = new TextDecoder();
        let bytes = 0;
        while (bytes < LinkPreviewController.MAX_BYTES) {
          const { done, value } = await reader.read();
          if (done) break;
          bytes += value.byteLength;
          html += decoder.decode(value, { stream: true });
          if (html.includes('</head>')) break;
        }
        reader.cancel().catch(() => {});
      }

      const pick = (prop: string): string | undefined => {
        const re = new RegExp(
          `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${prop}["']`,
          'i',
        );
        const m = html.match(re);
        return m ? (m[1] || m[2]) : undefined;
      };

      const titleTag = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1];
      const decode = (s?: string) =>
        s
          ?.replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .trim();

      let image = pick('og:image') || pick('twitter:image');
      // 상대 경로 이미지는 절대 경로로
      if (image && !/^https?:\/\//.test(image)) {
        try { image = new URL(image, url).href; } catch { image = undefined; }
      }

      const data: LinkPreview = {
        url,
        title: decode(pick('og:title') || pick('twitter:title') || titleTag),
        description: decode(pick('og:description') || pick('twitter:description') || pick('description')),
        image,
        siteName: decode(pick('og:site_name')) || parsed.hostname,
      };

      const result = data.title ? data : null;
      if (result) this.cache.set(url, { data: result, at: Date.now() });
      return { success: true, data: result };
    } catch {
      // 실패해도 조용히 — 미리보기는 부가 기능
      return { success: true, data: null };
    }
  }
}
