function authHeaders() {
    const token = localStorage.getItem('authToken')
    if (!token) {
        window.location.href = '/login'
        return {}
    }
    const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1]
    return {
        'Authorization': `Token ${token}`,
        'X-CSRFToken': csrfToken || '',
    }
}

export default authHeaders