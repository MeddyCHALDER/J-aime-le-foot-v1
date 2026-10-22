import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts } from '../../../theme/brand';
import { useAppTheme } from '../../../theme/ThemeContext';
import { KickoffPicker } from '../../matches/components/KickoffPicker';
import { toErrorMessage } from '../../../lib/errors';
import { formatOpening, votingStarted, type SeasonAward } from '../seasonAwardsApi';
import { useUpdateAwardOpening } from '../seasonAwardsHooks';

const pad = (n: number) => String(n).padStart(2, '0');

/** Date locale au format AAAA-MM-JJTHH:mm (celui de KickoffPicker). */
function toLocalInput(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Proposition par défaut : demain 9h. */
function defaultOpening() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return toLocalInput(d);
}

/**
 * Heure d'ouverture choisie : null = tout de suite, ISO sinon.
 * Erreur si la date est illisible ou déjà passée.
 */
export function openingToIso(scheduled: boolean, value: string): { iso: string | null; error?: string } {
  if (!scheduled) return { iso: null };
  const d = new Date(value);
  if (isNaN(d.getTime())) return { iso: null, error: 'Choisis une date et une heure d’ouverture.' };
  if (d.getTime() <= Date.now()) return { iso: null, error: 'Choisis une ouverture dans le futur, ou « Tout de suite ».' };
  return { iso: d.toISOString() };
}

interface OpeningFieldProps {
  scheduled: boolean;
  onScheduledChange: (scheduled: boolean) => void;
  /** AAAA-MM-JJTHH:mm, heure locale */
  value: string;
  onChange: (value: string) => void;
}

/** « Tout de suite » ou « Programmer » + date et heure d'ouverture du vote. */
export function OpeningField({ scheduled, onScheduledChange, value, onChange }: OpeningFieldProps) {
  const { tokens } = useAppTheme();
  const body = { fontFamily: fonts.body };
  const d = new Date(value);
  const valid = scheduled && !isNaN(d.getTime()) && d.getTime() > Date.now();

  return (
    <View>
      <Text style={[styles.label, body, { color: tokens.muted }]}>Ouverture du vote</Text>
      <View style={styles.row}>
        {(
          [
            [false, 'Tout de suite'],
            [true, 'Programmer'],
          ] as const
        ).map(([v, label]) => {
          const on = scheduled === v;
          return (
            <Pressable
              key={label}
              onPress={() => {
                if (v && !value) onChange(defaultOpening());
                onScheduledChange(v);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={[
                styles.btn,
                { borderColor: on ? tokens.lime : tokens.line },
                on && { backgroundColor: tokens.lime },
              ]}
            >
              <Text style={[styles.btnText, body, { color: on ? tokens.onLime : tokens.text }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      {scheduled ? <KickoffPicker value={value} onChange={onChange} labels={['Ouverture le', 'À']} /> : null}
      <Text style={[styles.hint, body, { color: tokens.muted }]}>
        {!scheduled
          ? 'Les joueurs peuvent voter dès maintenant.'
          : valid
            ? `Trophée visible tout de suite, vote à partir du ${formatOpening(d.toISOString())}. La ligue sera prévenue à ce moment-là.`
            : 'Choisis une date à venir.'}
      </Text>
    </View>
  );
}

/** Admin : voir et changer l'heure d'ouverture d'un trophée existant. */
export function AwardOpeningEditor({ award }: { award: SeasonAward }) {
  const { tokens } = useAppTheme();
  const body = { fontFamily: fonts.body };
  const save = useUpdateAwardOpening(award.id, award.season_id);
  const [editing, setEditing] = useState(false);
  const [scheduled, setScheduled] = useState(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const started = votingStarted(award);
  const current = started
    ? 'Vote ouvert'
    : award.opens_at
      ? `Ouvre le ${formatOpening(award.opens_at)}`
      : 'Vote ouvert';

  const startEditing = () => {
    const future = award.opens_at && !started;
    setScheduled(!!future);
    setValue(future ? toLocalInput(new Date(award.opens_at!)) : defaultOpening());
    setError(null);
    setEditing(true);
  };

  const submit = () => {
    const { iso, error: invalid } = openingToIso(scheduled, value);
    if (invalid) {
      setError(invalid);
      return;
    }
    setError(null);
    save.mutate(iso, { onSuccess: () => setEditing(false) });
  };

  return (
    <View style={[styles.box, { backgroundColor: tokens.surface, borderColor: tokens.line }]}>
      <Pressable onPress={() => (editing ? setEditing(false) : startEditing())} accessibilityRole="button" style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, body, { color: tokens.lime }]}>Ouverture du vote</Text>
          <Text style={[styles.current, body, { color: tokens.text }]}>{current}</Text>
        </View>
        <Text style={[styles.link, body, { color: tokens.lime }]}>{editing ? 'Fermer' : 'Modifier'}</Text>
      </Pressable>
      {editing ? (
        <>
          <OpeningField scheduled={scheduled} onScheduledChange={setScheduled} value={value} onChange={setValue} />
          <Pressable
            onPress={submit}
            disabled={save.isPending}
            style={[styles.save, { backgroundColor: tokens.lime }, save.isPending && { opacity: 0.5 }]}
            accessibilityRole="button"
          >
            <Text style={[styles.saveText, body, { color: tokens.onLime }]}>
              {save.isPending ? 'Enregistrement…' : 'Enregistrer l’ouverture'}
            </Text>
          </Pressable>
        </>
      ) : null}
      {error || save.error ? (
        <Text style={[styles.error, body, { color: tokens.errorText }]}>{error ?? toErrorMessage(save.error)}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  btn: { flex: 1, height: 42, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 14, fontWeight: '700' },
  hint: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
  box: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  title: { fontSize: 11, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase' },
  current: { fontSize: 15, fontWeight: '700', marginTop: 4, marginBottom: 6 },
  link: { fontSize: 14, fontWeight: '700' },
  save: { height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontSize: 15, fontWeight: '700' },
  error: { fontSize: 13, marginTop: 8 },
});
