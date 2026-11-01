function handler(event) {
  var request = event.request;
  var response = event.response;
  var excluded =
    Object.keys(request.querystring).length > 0 ||
    /^\/(search(?:\/|$)|library(?:\/|$))/.test(request.uri) ||
    /\/(seasons|episodes)\//.test(request.uri) ||
    (request.headers['x-movie-noindex'] &&
      request.headers['x-movie-noindex'].value === 'true');

  if (excluded) {
    response.headers['x-robots-tag'] = { value: 'noindex, follow' };
  }

  return response;
}
