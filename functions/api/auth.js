export function onRequest(context) {
  const client_id = context.env.GITHUB_CLIENT_ID;
  const redirect_uri = new URL(context.request.url).origin + '/api/callback';
  const scope = 'repo,user';

  if (!client_id) {
    return new Response("Missing GITHUB_CLIENT_ID environment variable", { status: 500 });
  }

  const url = `https://github.com/login/oauth/authorize?client_id=${client_id}&redirect_uri=${redirect_uri}&scope=${scope}`;
  return Response.redirect(url, 302);
}
