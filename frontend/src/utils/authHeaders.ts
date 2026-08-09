function authHeaders() {
    const token = localStorage.getItem('authToken')
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