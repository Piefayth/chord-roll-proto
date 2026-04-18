import { useDocument } from '../state/document';
import { resolveVoicing } from '../model/voicing';
import { ChordPicker } from './ChordPicker';
import { VoicingControls } from './VoicingControls';
import { GeneratorControls } from './GeneratorControls';

export function Inspector() {
  const { doc, selectedId, updateObject } = useDocument();
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

  const voiceCount = resolveVoicing(obj.pitchSet, obj.voicing).length;

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
        voiceCount={voiceCount}
        onChange={(generator) => updateObject(obj.id, { generator })}
      />
    </aside>
  );
}
