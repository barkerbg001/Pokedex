import Modal from '../Modal/Modal';
import GenerationList from './GenerationList';

// Mobile generation picker, opened from the bottom navigation bar
function GenerationSheet({ generations, selectedGeneration, onSelectGeneration, onClose }) {
  return (
    <Modal label="Choose generation" className="generation-sheet" onClose={onClose}>
      {(close) => (
        <>
          <div className="generation-sheet-header" data-sheet-drag>
            <h2>Generations</h2>
          </div>
          <div className="generation-sheet-body">
            <GenerationList
              generations={generations}
              selectedGeneration={selectedGeneration}
              onSelectGeneration={(name) => {
                onSelectGeneration(name);
                close();
              }}
            />
          </div>
        </>
      )}
    </Modal>
  );
}

export default GenerationSheet;
