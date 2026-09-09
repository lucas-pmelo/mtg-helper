import { useState } from 'react';
import sheetsData from '../../data/sheets.json';
import { DECK_SIZE } from '../../domain/stickers/drawStickers';
import type { Sheet } from '../../domain/types';
import { useStickerStore } from '../../stores/stickerStore';
import { Icon } from '../components/Icon';

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
      <header className="screen-head">
        <div>
          <h1>Stickers</h1>
          <p className="subtitle">Sticker deck do Unfinity</p>
        </div>
        <span className="counter-box" data-complete={isComplete}>
          <span className="counter">
            {sheetIds.length}/{DECK_SIZE}
          </span>
          <span className="label">folhas</span>
        </span>
      </header>

      <div className="segmented">
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
                  <img src={sheet.image} alt="" loading="lazy" />
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <button
            className="btn gap-top"
            type="button"
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

          {drawnSheets.length > 0 ? (
            <>
              <h2>Último draw</h2>
              <div className="draw-result">
                {drawnSheets.map((sheet) => (
                  <button
                    key={sheet.id}
                    type="button"
                    aria-label={`Ampliar ${sheet.name}`}
                    onClick={() => setZoomed(sheet)}
                  >
                    <img src={sheet.image} alt={sheet.name} />
                  </button>
                ))}
              </div>
              <p className="muted gap-top">Toque para ampliar.</p>
            </>
          ) : (
            isComplete && (
              <p className="empty gap-top">
          <Icon name="target" size={28} className="empty-icon" />
                Nenhum draw ainda. Toque em Draw 3 para sortear as três folhas da partida.
              </p>
            )
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
