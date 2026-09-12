const SOUND_PATH = '/sound/lichess/standard'

function playSound(sound: 'Move' | 'Capture' | 'Castle') {
    if (sound === 'Castle') {
        new Audio(`${SOUND_PATH}/Move.mp3`).play().catch(() => {})
        setTimeout(() => {
            new Audio(`${SOUND_PATH}/Move.mp3`).play().catch(() => {})
        }, 120)
        return
    }
    new Audio(`${SOUND_PATH}/${sound}.mp3`).play().catch(() => {})
}

export default playSound
