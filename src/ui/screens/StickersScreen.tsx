import { useState } from 'react';
import sheetsData from '../../data/sheets.json';
import { DECK_SIZE } from '../../domain/stickers/drawStickers';
import type { Sheet } from '../../domain/types';
import { useStickerStore } from '../../stores/stickerStore';

const sheets = sheetsData as Sheet[];
const sheetById = new Map(sheets.map((sheet) => [sheet.id, sheet]));

export function StickersScreen() {
  const { sheetIds, lastDraw, toggleSheet, draw } = useStickerStore();
  const [editing, setEditing] = useState(false);
  const [zoomed, setZoomed] = useState<Sheet | null>(null);

  const isComplete = sheetIds.length === DECK_SIZE;
  const drawnSheets = (lastDraw?.sheetIds ?? [])
    .map((id) => sheetById.get(id))
    .filter((sheet): sheet is Sheet => Boolean(sheet));

  return (
    <div className="screen">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0 }}>Stickers</h1>
        <span className="counter" style={{ color: isComplete ? 'var(--accent)' : 'var(--muted)' }}>
          {sheetIds.length}/{DECK_SIZE}
        </span>
      </div>

      <div className="segmented" style={{ marginTop: 14 }}>
        <button type="button" aria-pressed={!editing} onClick={() => setEditing(false)}>
          Draw
        </button>
        <button type="button" aria-pressed={editing} onClick={() => setEditing(true)}>
          Montar deck
        </button>
      </div>

      {editing ? (
        <>
          <h2>As 48 folhas do Unfinity</h2>
          <div className="sheet-grid">
            {sheets.map((sheet) => {
              const selected = sheetIds.includes(sheet.id);

              return (
                <button
                  className="sheet-cell"
                  key={sheet.id}
                  type="button"
                  aria-pressed={selected}
                  aria-label={sheet.name}
                  disabled={!selected && isComplete}
                  onClick={() => toggleSheet(sheet.id)}
                >
                  <img src={sheet.image} alt={sheet.name} loading="lazy" />
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <button
            className="btn"
            type="button"
            style={{ marginTop: 16 }}
            disabled={!isComplete}
            onClick={draw}
          >
            Draw 3
          </button>

          {!isComplete && (
            <p className="error">
              Selecione exatamente {DECK_SIZE} folhas em “Montar deck” ({sheetIds.length}/
              {DECK_SIZE}).
            </p>
          )}

          {drawnSheets.length > 0 && (
            <>
              <h2>Último draw</h2>
              <div className="draw-result">
                {drawnSheets.map((sheet) => (
                  <button key={sheet.id} type="button" onClick={() => setZoomed(sheet)}>
                    <img src={sheet.image} alt={sheet.name} />
                  </button>
                ))}
              </div>
              <p className="muted" style={{ marginTop: 8 }}>
                Toque para ampliar.
              </p>
            </>
          )}
        </>
      )}

      {zoomed && (
        <button className="zoom" type="button" onClick={() => setZoomed(null)} aria-label="Fechar">
          <img src={zoomed.image} alt={zoomed.name} />
        </button>
      )}
    </div>
  );
}
