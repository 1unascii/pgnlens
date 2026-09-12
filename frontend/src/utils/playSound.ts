const SOUND_PATH = '/sound/lichess/standard'

function playSound(sound: 'Move' | 'Capture' | 'Castle' | 'Error', isCheck = false) {
    if (sound === 'Castle') {
        new Audio(`${SOUND_PATH}/Move.mp3`).play().catch(() => {})
        setTimeout(() => {
            new Audio(`${SOUND_PATH}/Move.mp3`).play().catch(() => {})
        }, 105)
    } else {
        new Audio(`${SOUND_PATH}/${sound}.mp3`).play().catch(() => {})
    }
    if (isCheck) {
        const checkSound = new Audio(`${SOUND_PATH}/Check.mp3`)
        checkSound.volume = 0.15
        checkSound.play().catch(() => {})
    }
}

export default playSound
