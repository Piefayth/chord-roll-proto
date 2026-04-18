import { useDocument } from '../state/document';
import { ChordPicker } from './ChordPicker';
import { VoicingControls } from './VoicingControls';
import { GeneratorControls } from './GeneratorControls';

export function Inspector() {
  const { doc, selectedId, updateObject } = useDocument();
  const obj = doc.objects.find((o) => o.id === selectedId);

  if (!obj) {
    return (
      <aside className="inspector empty">
        <p>Select an object to edit.</p>
      </aside>
    );
  }

  const generatorIsSequence =
    obj.generator.pitchPattern.kind === 'cycle' || obj.generator.pitchPattern.kind === 'degreeSequence';

  return (
    <aside className="inspector" data-testid="inspector">
      <ChordPicker
        pitchSet={obj.pitchSet}
        onChange={(pitchSet) => updateObject(obj.id, { pitchSet })}
      />
      <VoicingControls
        pitchSet={obj.pitchSet}
        voicing={obj.voicing}
        generatorIsSequence={generatorIsSequence}
        onChange={(voicing) => updateObject(obj.id, { voicing })}
      />
      <GeneratorControls
        generator={obj.generator}
        onChange={(generator) => updateObject(obj.id, { generator })}
      />
    </aside>
  );
}
