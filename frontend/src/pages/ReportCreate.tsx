import { useState } from 'react'

async function uploadPGNFileAndCreateReport(file: File, playerName: string) {
    
    const formData = new FormData()
    formData.append('file', file)
    formData.append('player_name', playerName)

    const response = await fetch('/api/reports/', {
        method: 'POST',
        body: formData, // send the form data to the server
    })

    const result = await response.json()
    console.log('Created report:', result)
    return result // return the result to the caller
    
}

function ReportsCreate() {
    
    const [file, setFile] = useState<File | null>(null)
    const [playerName, setPlayerName] = useState<string>('')
    
    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault() // stop the browser from reloading the page
        // if (!file) { // uncomment and comment the next line to not require a player name
        if (!file || !playerName) return // return if the file or player name is not set
        await uploadPGNFileAndCreateReport(file, playerName)
    }

    return (
        <form onSubmit={handleSubmit}>
            <input 
            type="file" 
            accept=".pgn"
            required
            onChange={(event) => setFile(event.target.files?.[0] || null)} 
            />
            <input 
            type="text"
            placeholder="Enter player name"
            value={playerName}
            onChange={(event) => setPlayerName(event.target.value)}
            /> <br />
            
            <button type="submit">Upload and Create Report</button>
        
        </form>
    )
}

export default ReportsCreate