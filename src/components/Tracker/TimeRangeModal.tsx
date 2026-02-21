import closeIcon from '../../assets/close.svg';
import closeNavIcon from '../../assets/close-nav.svg';
import './TimeRangeModal.css';

type TimeRangeModalProps = {
  title: string;
  onSelect: (hour: number) => void;
  onClose: () => void;
};

const HOURS = Array.from({ length: 25 }, (_, i) => i);

export default function TimeRangeModal({ title, onSelect, onClose }: TimeRangeModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal time-range-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="modal-close modal-close-img" onClick={onClose} aria-label="Закрыть">
            <img src={closeIcon} alt="" className="icon-img default" />
            <img src={closeNavIcon} alt="" className="icon-img hover" />
          </button>
        </div>
        <div className="modal-body time-range-buttons">
          {HOURS.map((h) => (
            <button
              key={h}
              type="button"
              className="time-range-btn"
              onClick={() => {
                onSelect(h);
                onClose();
              }}
            >
              {String(h).padStart(2, '0')}:00
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
