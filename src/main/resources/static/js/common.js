<script>
function getToken() {
    return localStorage.getItem("token");
}

function authFetch(url, options = {}) {
    return fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + getToken(),
            ...(options.headers || {})
        }
    });
}
</script>
