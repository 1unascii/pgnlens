import { FaAngleDoubleLeft, FaAngleLeft, FaAngleRight, FaAngleDoubleRight } from 'react-icons/fa'

interface NavButtonsProps {
    onStart: () => void   // jump to move 0
    onBack: () => void    // step back one half-move
    onForward: () => void // step forward one half-move
    onEnd: () => void     // jump to last move
}

// Navigation buttons for stepping through a game. Displayed at the bottom of the info panel.
function NavButtons({ onStart, onBack, onForward, onEnd }: NavButtonsProps) {
    const style = 'flex-1 bg-gray-700 hover:bg-gray-600 rounded py-2 flex items-center justify-center text-lg'
    return (
        <div className="flex gap-1 border-t border-gray-700 pt-2">
            <button className={style} onClick={onStart}><FaAngleDoubleLeft /></button>
            <button className={style} onClick={onBack}><FaAngleLeft /></button>
            <button className={style} onClick={onForward}><FaAngleRight /></button>
            <button className={style} onClick={onEnd}><FaAngleDoubleRight /></button>
        </div>
    )
}

export default NavButtons