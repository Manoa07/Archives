// Couche d'accès HTTP unique.
// Toute requête frontend -> backend devrait passer par ici,
// ce qui simplifie la gestion des erreurs et des réponses JSON.
(function attachApi(global) {
    async function apiRequest(url, options = {}) {
        const response = await fetch(url, {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {})
            },
            body: options.body ? JSON.stringify(options.body) : undefined
        });

        const data = await parseResponseBody(response);

        if (!response.ok) {
            const error = new Error(data.message || data.error || 'Erreur serveur');
            error.status = response.status;
            throw error;
        }

        return data;
    }

    async function parseResponseBody(response) {
        const contentType = response.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
            return response.json();
        }

        return {};
    }

    global.AppApi = {
        apiRequest
    };
}(window));
