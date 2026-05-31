export async function onRequest(context) {
  const client_id = context.env.GITHUB_CLIENT_ID;
  const client_secret = context.env.GITHUB_CLIENT_SECRET;

  const url = new URL(context.request.url);
  const code = url.searchParams.get('code');

  if (!client_id || !client_secret) {
    return new Response("Missing client credentials in environment variables", { status: 500 });
  }

  if (!code) {
    return new Response("No code parameter provided by GitHub", { status: 400 });
  }

  try {
    // Intercambiar código temporal de GitHub por token de acceso
    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        client_id,
        client_secret,
        code
      })
    });

    const data = await response.json();

    if (data.error) {
      return new Response(`OAuth Error: ${data.error_description || data.error}`, { status: 400 });
    }

    // Comunicar el token a la ventana padre (Decap CMS)
    const postMessageScript = `
      <!DOCTYPE html>
      <html>
      <head><title>Autenticando...</title></head>
      <body>
        <script>
          const token = "${data.access_token}";
          const provider = "github";
          
          window.opener.postMessage(
            'authorization:' + provider + ':success:' + JSON.stringify({ token: token, provider: provider }),
            '*'
          );
          window.close();
        </script>
      </body>
      </html>
    `;

    return new Response(postMessageScript, {
      headers: { "Content-Type": "text/html" }
    });

  } catch (e) {
    return new Response(`Server Error: ${e.message}`, { status: 500 });
  }
}
