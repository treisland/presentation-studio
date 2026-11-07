export async function mediaDiagnostics(page) {
  return page.evaluate(() => ({
    browser: navigator.userAgent,
    media: [...document.querySelectorAll('video')].map((video) => ({
      source: video.currentSrc,
      readyState: video.readyState,
      networkState: video.networkState,
      paused: video.paused,
      currentTime: video.currentTime,
      duration: Number.isFinite(video.duration) ? video.duration : null,
      error: video.error && { code: video.error.code, message: video.error.message },
      webm: video.canPlayType('video/webm; codecs="vp8"'),
      mp4: video.canPlayType('video/mp4; codecs="avc1.42E01E"'),
    })),
  }));
}

export async function waitForVideo(page, selector) {
  try {
    await page.waitForFunction((target) => document.querySelector(target)?.readyState >= 2, selector);
  } catch (error) {
    throw new Error('Video did not become ready: ' + JSON.stringify(await mediaDiagnostics(page)), { cause: error });
  }
}
