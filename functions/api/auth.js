export function onRequest(context) {
  const client_id = context.env.GITHUB_CLIENT_ID;
  const urlObj = new URL(context.request.url);
  const redirect_uri = urlObj.origin + '/api/callback';
  const scope = 'repo,user';
  const state = urlObj.searchParams.get('state');

  if (!client_id) {
    return new Response("Missing GITHUB_CLIENT_ID environment variable", { status: 500 });
  }

  let url = `https://github.com/login/oauth/authorize?client_id=${client_id}&redirect_uri=${redirect_uri}&scope=${scope}`;
  if (state) {
    url += `&state=${encodeURIComponent(state)}`;
  }
  return Response.redirect(url, 302);
}
