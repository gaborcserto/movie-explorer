function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // Only browser documents on real application routes may use the SPA entry.
  // File requests must never receive HTML, even inside an application route.
  var route =
    uri === '/' ||
    uri === '/library' ||
    /^\/search(?:\/[^/]+)?\/?$/.test(uri) ||
    /^\/(movie|person)\/[^/.]+\/?$/.test(uri) ||
    /^\/(series|tv)\/[^/.]+(?:\/seasons\/[^/.]+(?:\/episodes\/[^/.]+)?)?\/?$/.test(
      uri,
    );
  var acceptsHtml =
    request.headers.accept &&
    request.headers.accept.value.indexOf('text/html') !== -1;
  var staticFile =
    /\.(js|mjs|cjs|css|map|json|xml|txt|ico|svg|png|jpe?g|webp|avif|gif|woff2?|ttf|mp4|webm|pdf)$/i.test(
      uri,
    );

  // Set this on every request so a viewer cannot spoof the internal marker.
  request.headers['x-movie-noindex'] = {
    value:
      Object.keys(request.querystring).length > 0 ||
      /^\/(search(?:\/|$)|library(?:\/|$))/.test(uri) ||
      /\/(seasons|episodes)\//.test(uri)
        ? 'true'
        : 'false',
  };

  if (
    (request.method === 'GET' || request.method === 'HEAD') &&
    route &&
    acceptsHtml &&
    !staticFile
  ) {
    request.uri = '/index.html';
  }

  return request;
}
