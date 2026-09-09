import { useRef, useState } from 'react';
import { BACKUP_VERSION, parseBackup, serializeBackup, type Backup } from '../../data/storage';
import { useHistoryStore } from '../../stores/historyStore';
import { usePeopleStore } from '../../stores/peopleStore';
import { useStickerStore } from '../../stores/stickerStore';
import { checkSeason, sortSeasons } from '../../domain/history/seasons';
import { today } from '../../domain/history/today';
import type { Id, Season } from '../../domain/types';
import { formatDay } from '../formatDay';

const emptyForm = () => ({ name: '', startsOn: today(), endsOn: '' });

export function SettingsScreen() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { seasons, addSeason, updateSeason, removeSeason } = useHistoryStore();
  const [editingId, setEditingId] = useState<Id | null>(null);
  const [form, setForm] = useState(emptyForm);

  const draft = { name: form.name, startsOn: form.startsOn, endsOn: form.endsOn || null };
  const reason = checkSeason(
    draft,
    seasons.filter((season) => season.id !== editingId),
  );

  function saveSeason() {
    if (editingId) updateSeason(editingId, draft);
    else addSeason(draft);

    setEditingId(null);
    setForm(emptyForm());
  }

  function editSeason(season: Season) {
    setEditingId(season.id);
    setForm({ name: season.name, startsOn: season.startsOn, endsOn: season.endsOn ?? '' });
  }

  function exportBackup() {
    const backup: Backup = {
      version: BACKUP_VERSION,
      people: usePeopleStore.getState().people,
      decks: usePeopleStore.getState().decks,
      stickerDeck: { sheetIds: useStickerStore.getState().sheetIds },
      lastDraw: useStickerStore.getState().lastDraw,
      matches: useHistoryStore.getState().matches,
      seasons: useHistoryStore.getState().seasons,
    };

    const url = URL.createObjectURL(
      new Blob([serializeBackup(backup)], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `mtg-helper-${today()}.json`;
    link.click();
    URL.revokeObjectURL(url);

    setError(null);
    setMessage('Backup exportado.');
  }

  async function importBackup(file: File) {
    setMessage(null);

    try {
      const backup = parseBackup(await file.text());

      if (!confirm('Isto substitui todos os dados atuais. Continuar?')) return;

      usePeopleStore.getState().replaceAll(backup.people, backup.decks);
      useStickerStore.getState().replaceAll(backup.stickerDeck.sheetIds, backup.lastDraw);
      useHistoryStore.getState().replaceAll(backup.matches, backup.seasons);

      setError(null);
      setMessage('Backup importado.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível importar o arquivo');
    }
  }

  return (
    <div className="screen">
      <header className="screen-head">
        <div>
          <h1>Configurações</h1>
          <p className="subtitle">Temporadas e backup dos dados deste aparelho.</p>
        </div>
      </header>

      <h2>Temporadas</h2>

      <section className="card stack">
        <label className="field">
          <span className="field-label">Nome</span>
          <input
            type="text"
            value={form.name}
            placeholder="Temporada 2026"
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </label>

        <label className="field">
          <span className="field-label">Início</span>
          <input
            type="date"
            value={form.startsOn}
            onChange={(event) => setForm({ ...form, startsOn: event.target.value })}
          />
        </label>

        <label className="field">
          <span className="field-label">Fim (vazio = em andamento)</span>
          <input
            type="date"
            value={form.endsOn}
            onChange={(event) => setForm({ ...form, endsOn: event.target.value })}
          />
        </label>

        {reason && <p className="error">{reason}</p>}

        <div className="form-actions">
          <button className="btn" type="button" disabled={Boolean(reason)} onClick={saveSeason}>
            {editingId ? 'Salvar temporada' : 'Criar temporada'}
          </button>

          {editingId && (
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm());
              }}
            >
              Cancelar
            </button>
          )}
        </div>
      </section>

      {seasons.length === 0 ? (
        <p className="empty gap-top">Nenhuma temporada cadastrada.</p>
      ) : (
        <div className="stack gap-top">
          {sortSeasons(seasons).map((season) => (
            <article className="card" key={season.id}>
              <div className="season-head">
                <span className="rank-main">{season.name}</span>
                <span className="muted">
                  {formatDay(season.startsOn)} —{' '}
                  {season.endsOn ? formatDay(season.endsOn) : 'em andamento'}
                </span>
              </div>

              <hr className="divider" />

              <div className="row">
                <button
                  className="btn btn-secondary btn-slim"
                  type="button"
                  onClick={() => editSeason(season)}
                >
                  Editar
                </button>
                <button
                  className="btn btn-danger btn-slim"
                  type="button"
                  onClick={() => {
                    if (confirm('Apagar esta temporada? As partidas continuam no histórico.')) {
                      removeSeason(season.id);
                    }
                  }}
                >
                  Apagar
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <h2>Backup</h2>

      <section className="card stack">
        <button className="btn" type="button" onClick={exportBackup}>
          Exportar backup
        </button>

        <button
          className="btn btn-secondary"
          type="button"
          onClick={() => fileInput.current?.click()}
        >
          Importar backup
        </button>

        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) importBackup(file);
            event.target.value = '';
          }}
        />

        {message && <p className="notice">{message}</p>}
        {error && <p className="error">{error}</p>}
      </section>

      <p className="muted gap-top-lg">
        Os dados ficam só neste aparelho. O Safari pode limpar o storage de sites sem aviso —
        exporte o backup de vez em quando.
      </p>
    </div>
  );
}
