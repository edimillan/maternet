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
      <head>
        <title>Autenticando...</title>
        <style>
          body { font-family: sans-serif; text-align: center; padding: 50px; background: #f4f6f8; color: #333; }
          .card { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); display: inline-block; max-width: 450px; }
          .error { color: #d9534f; }
          .success { color: #5cb85c; }
          pre { background: #eee; padding: 10px; border-radius: 4px; text-align: left; overflow-x: auto; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>Autenticación del CMS</h2>
          <div id="status">Procesando respuesta de GitHub...</div>
          <div id="debug" style="margin-top: 20px; display: none;">
            <h3>Detalles de depuración:</h3>
            <pre id="debug-content"></pre>
          </div>
        </div>

        <script>
          const token = ${data.access_token ? `"${data.access_token}"` : "null"};
          const provider = "github";
          const dataResponse = ${JSON.stringify(data)};

          const statusDiv = document.getElementById('status');
          const debugDiv = document.getElementById('debug');
          const debugContent = document.getElementById('debug-content');

          if (!token) {
            statusDiv.innerHTML = "<h3 class='error'>Error: GitHub no devolvió un token de acceso.</h3><p>Esto suele ocurrir si el Client ID o Client Secret son incorrectos, o si el código de autorización ya caducó.</p>";
            debugContent.textContent = JSON.stringify(dataResponse, null, 2);
            debugDiv.style.display = 'block';
          } else {
            statusDiv.innerHTML = "<h3 class='success'>¡Autenticación Exitosa!</h3><p>Conectando con el panel del administrador...</p>";
            
            try {
              if (window.opener) {
                window.opener.postMessage(
                  'authorization:' + provider + ':success:' + JSON.stringify({ token: token, provider: provider }),
                  '*'
                );
                // Cerrar después de 1.5 segundos para dar tiempo a que se procese
                setTimeout(() => {
                  window.close();
                }, 1500);
              } else {
                statusDiv.innerHTML = "<h3 class='error'>Error: No se encontró la ventana principal (opener).</h3>";
              }
            } catch (e) {
              statusDiv.innerHTML = "<h3 class='error'>Error al enviar mensaje: " + e.message + "</h3>";
            }
          }
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
