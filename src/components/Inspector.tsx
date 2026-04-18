import { useDocument } from '../state/document';
import { resolveVoicing } from '../model/voicing';
import { effectivePitchSet } from '../model/pitchOps';
import { ChordPicker } from './ChordPicker';
import { VoicingControls } from './VoicingControls';
import { GeneratorControls } from './GeneratorControls';

export function Inspector() {
  const {
    doc,
    selectedId,
    setSelectedId,
    updateObject,
    updatePitchSet,
    removeObject,
    copySelected,
  } = useDocument();
  const obj = doc.objects.find((o) => o.id === selectedId);

  if (!obj) {
    return (
      <aside className="inspector empty">
        <p>Tap empty space on the roll to add an object.</p>
      </aside>
    );
  }

  const generatorIsSequence =
    obj.generator.pitchPattern.kind === 'cycle' || obj.generator.pitchPattern.kind === 'degreeSequence';

  const effective = effectivePitchSet(obj);
  const voiceCount = resolveVoicing(effective, obj.voicing).length;

  return (
    <aside className="inspector" data-testid="inspector">
      <div className="inspector-header">
        <span className="chord-name">{effective.name}</span>
        <div className="inspector-actions">
          <button
            type="button"
            className="inspector-action"
            aria-label="deselect"
            onClick={() => setSelectedId(null)}
          >
            deselect
          </button>
          <button
            type="button"
            className="inspector-action"
            aria-label="copy selected object"
            onClick={copySelected}
          >
            copy
          </button>
          <button
            type="button"
            className="inspector-delete"
            aria-label="delete selected object"
            onClick={() => removeObject(obj.id)}
          >
            delete
          </button>
        </div>
      </div>
      <ChordPicker
        pitchSet={obj.pitchSet}
        onChange={(pitchSet) => updatePitchSet(obj.id, pitchSet)}
      />
      <VoicingControls
        pitchSet={obj.pitchSet}
        voicing={obj.voicing}
        generatorIsSequence={generatorIsSequence}
        onChange={(voicing) => updateObject(obj.id, { voicing })}
      />
      <GeneratorControls
        generator={obj.generator}
        voiceCount={voiceCount}
        onChange={(generator) => updateObject(obj.id, { generator })}
      />
    </aside>
  );
}
