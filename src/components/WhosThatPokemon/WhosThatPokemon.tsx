import { useState, useEffect, useRef, useMemo, useCallback, type ChangeEvent, type FormEvent } from 'react';
import type { IconType } from 'react-icons';
import { FiList, FiEdit3 } from 'react-icons/fi';
import './WhosThatPokemon.css';
import pokeapi from '../../api/pokeapi';
import useOnlineStatus from '../../hooks/useOnlineStatus';
import { vibrate } from '../../haptics';
import { buildPool, pickRound, normalizeName, formatName } from './quiz';
import type { Generation, Pokemon } from '../../types/pokeapi';

const PREFS_KEY = 'pokedex-quiz-prefs';
const BEST_KEY = 'pokedex-quiz-best';

type QuizMode = 'choice' | 'type';

type QuizPrefs = {
  mode: QuizMode;
  gen: string;
};

type PoolEntry = {
  id: number;
  name: string;
};

type RoundBase = {
  answer: PoolEntry;
  choices: PoolEntry[];
};

type RoundData = RoundBase & {
  pokemon: Pokemon;
  image: string;
};

type QuizStatus = 'loading' | 'ready' | 'error';

type QuizResult = {
  correct: boolean;
  picked: string | null;
};

type PrefetchEntry = {
  key: string;
  promise: Promise<RoundData | null>;
};

const MODES: { value: QuizMode; label: string; icon: IconType }[] = [
  { value: 'choice', label: 'Choose', icon: FiList },
  { value: 'type', label: 'Type it', icon: FiEdit3 },
];

function readPrefs(): QuizPrefs {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) ?? 'null') as {
      mode?: string;
      gen?: string;
    } | null;
    return {
      mode: saved?.mode === 'type' ? 'type' : 'choice',
      gen: typeof saved?.gen === 'string' ? saved.gen : 'all',
    };
  } catch {
    return { mode: 'choice', gen: 'all' };
  }
}

function readBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage full or blocked: the game still works, it just won't remember
  }
}

function getArtwork(pokemon: Pokemon): string | null {
  return (
    pokemon.sprites?.other?.['official-artwork']?.front_default ||
    pokemon.sprites?.front_default ||
    null
  );
}

// Warm the browser cache so the next round's picture shows straight away
function preloadImage(url: string) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = url;
}

// Pick a Pokémon and fetch its data, skipping any without a picture
async function fetchRound(pool: PoolEntry[], excludeId: number | null): Promise<RoundData | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const picked = pickRound(pool, Math.random, excludeId) as RoundBase | null;
    if (!picked) return null;
    const { data } = await pokeapi.get<Pokemon>(`/pokemon/${picked.answer.id}`);
    const image = getArtwork(data);
    if (image) {
      preloadImage(image);
      return { ...picked, pokemon: data, image };
    }
  }
  throw new Error('No artwork found');
}

type Props = {
  generations: Generation[];
  onOpenPokemon: (pokemon: Pokemon) => void;
};

// "Who's That Pokémon?": guess a Pokémon from its silhouette, by picking from
// four names or typing it, then see it revealed
function WhosThatPokemon({ generations, onOpenPokemon }: Props) {
  const [prefs, setPrefs] = useState<QuizPrefs>(readPrefs);
  // A generation saved from an earlier visit might not exist any more
  const gen = generations.some((g) => g.name === prefs.gen) ? prefs.gen : 'all';
  const pool = useMemo(
    () => buildPool(generations, gen) as PoolEntry[],
    [generations, gen]
  );
  const poolKey = `${gen}:${pool.length}`;

  const [round, setRound] = useState<RoundData | null>(null);
  const [status, setStatus] = useState<QuizStatus>('loading');
  const [loadedImage, setLoadedImage] = useState<string | null>(null);
  // null while guessing; then { correct, picked } (picked is null after giving up)
  const [result, setResult] = useState<QuizResult | null>(null);
  const [guess, setGuess] = useState('');
  const [score, setScore] = useState({ correct: 0, answered: 0, streak: 0 });
  const [best, setBest] = useState(readBest);
  const online = useOnlineStatus();

  const roundIdRef = useRef(0);
  // The following round, fetched while the player is still on this one
  const prefetchRef = useRef<PrefetchEntry | null>(null);
  const nextButtonRef = useRef<HTMLButtonElement | null>(null);
  const guessInputRef = useRef<HTMLInputElement | null>(null);

  const startRound = useCallback(
    async (excludeId: number | null = null) => {
      const roundId = ++roundIdRef.current;
      const prefetched = prefetchRef.current;
      prefetchRef.current = null;
      setStatus('loading');
      setResult(null);
      setGuess('');
      if (pool.length === 0) return;
      try {
        const next = await (prefetched?.key === poolKey
          ? prefetched.promise
          : fetchRound(pool, excludeId));
        if (roundId !== roundIdRef.current) return;
        setRound(next);
        setStatus('ready');
      } catch {
        if (roundId !== roundIdRef.current) return;
        setStatus('error');
      }
    },
    [pool, poolKey]
  );

  // A new game whenever the generation changes (or generations finish loading)
  useEffect(() => {
    startRound();
    // startRound changes exactly when poolKey does
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolKey]);

  // Once a round is showing, get the next one ready in the background
  useEffect(() => {
    if (status !== 'ready' || !round || prefetchRef.current) return;
    const promise = fetchRound(pool, round.answer.id);
    // Failures surface when (if) the prefetched round is actually used
    promise.catch(() => {});
    prefetchRef.current = { key: poolKey, promise };
  }, [status, round, pool, poolKey]);

  const updatePrefs = (changes: Partial<QuizPrefs>) => {
    const next = { ...prefs, gen, ...changes };
    setPrefs(next);
    save(PREFS_KEY, JSON.stringify(next));
  };

  const answer = (picked: string | null) => {
    if (result || status !== 'ready' || !round) return;
    const correct = picked !== null && normalizeName(picked) === normalizeName(round.answer.name);
    vibrate(correct ? 15 : [30, 60, 30]);
    setResult({ correct, picked });
    const streak = correct ? score.streak + 1 : 0;
    setScore({
      correct: score.correct + (correct ? 1 : 0),
      answered: score.answered + 1,
      streak,
    });
    if (streak > best) {
      setBest(streak);
      save(BEST_KEY, String(streak));
    }
  };

  const nextRound = () => startRound(round?.answer.id ?? null);

  // Move focus to "Next" after answering, so Enter/Space carries on
  useEffect(() => {
    if (result) nextButtonRef.current?.focus();
  }, [result]);

  // Number keys 1-4 pick a choice
  useEffect(() => {
    if (prefs.mode !== 'choice' || result || status !== 'ready' || !round) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as Element | null;
      if (target?.closest?.('input, select, textarea')) return;
      const choice = round.choices[Number(e.key) - 1];
      if (choice) answer(choice.name);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const revealed = Boolean(result);
  const answerName = round ? formatName(round.answer.name) : '';

  const resultTone = result ? (result.correct ? 'is-correct' : 'is-wrong') : '';

  return (
    <div className="quiz-page">
      <header className="quiz-header">
        <h2 className="page-title quiz-title">Who’s That Pokémon?</h2>
        <p className="quiz-tagline">Guess from the silhouette</p>
      </header>

      <div className="quiz-controls">
        <label className="quiz-field">
          <span className="quiz-field-label">From</span>
          <select
            className="quiz-gen"
            aria-label="Pokémon from"
            value={gen}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
              updatePrefs({ gen: e.target.value })
            }
          >
            <option value="all">All generations</option>
            {generations.map((g) => (
              <option key={g.name} value={g.name}>
                {g.displayName}
              </option>
            ))}
          </select>
        </label>
        <div className="quiz-mode-group" role="group" aria-label="Answer by">
          {MODES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              className={`quiz-mode ${prefs.mode === value ? 'active' : ''}`}
              aria-pressed={prefs.mode === value}
              onClick={() => updatePrefs({ mode: value })}
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="quiz-score" role="status" aria-live="polite">
        <div className="quiz-stat">
          <span className="quiz-stat-label">Score</span>
          <strong>
            {score.correct}/{score.answered}
          </strong>
        </div>
        <div className={`quiz-stat ${score.streak > 0 ? 'is-hot' : ''}`}>
          <span className="quiz-stat-label">Streak</span>
          <strong>{score.streak}</strong>
        </div>
        <div className="quiz-stat">
          <span className="quiz-stat-label">Best</span>
          <strong>{best}</strong>
        </div>
      </div>

      {status === 'error' ? (
        <div className="pokedex-error-inline">
          <p>
            {online
              ? 'Couldn’t load a Pokémon from PokéAPI.'
              : 'You’re offline. The game needs a connection to load new Pokémon.'}
          </p>
          <button type="button" onClick={() => startRound(round?.answer.id ?? null)}>
            Try Again
          </button>
        </div>
      ) : (
        <div className={`quiz-board ${revealed ? 'is-revealed' : ''}`}>
          <div className={`quiz-stage ${revealed ? 'revealed' : ''}`}>
            <div className="quiz-stage-glow" aria-hidden="true" />
            {status === 'ready' && round && (
              // crossOrigin: a CORS response can be cached for offline use (see sw.js)
              <img
                key={round.image}
                className={`quiz-art ${loadedImage === round.image ? 'loaded' : ''}`}
                src={round.image}
                crossOrigin="anonymous"
                alt={revealed ? answerName : 'Silhouette of a mystery Pokémon'}
                width={320}
                height={320}
                onLoad={() => setLoadedImage(round.image)}
                onError={() => setStatus('error')}
              />
            )}
            {(status !== 'ready' || !round || loadedImage !== round.image) && (
              <div className="quiz-placeholder" aria-hidden="true" />
            )}
            {!revealed && status === 'ready' && loadedImage === round?.image && (
              <p className="quiz-prompt">Who’s that?</p>
            )}
          </div>

          <p className={`quiz-result ${resultTone}`} aria-live="polite">
            {result &&
              (result.correct ? (
                <>
                  Correct! It’s <strong>{answerName}</strong>!
                </>
              ) : (
                <>
                  {result.picked === null ? 'It’s' : 'Not quite, it’s'}{' '}
                  <strong>{answerName}</strong>!
                </>
              ))}
          </p>

          {status === 'ready' &&
            round &&
            (prefs.mode === 'choice' ? (
              <div className="quiz-choices">
                {round.choices.map((choice, i) => {
                  const isAnswer = choice.name === round.answer.name;
                  const state = !result
                    ? ''
                    : isAnswer
                      ? 'correct'
                      : choice.name === result.picked
                        ? 'wrong'
                        : '';
                  return (
                    <button
                      key={choice.id}
                      type="button"
                      className={`quiz-choice ${state}`}
                      disabled={revealed}
                      onClick={() => answer(choice.name)}
                    >
                      <span className="quiz-choice-key" aria-hidden="true">
                        {i + 1}
                      </span>
                      <span className="quiz-choice-label">{formatName(choice.name)}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <form
                className="quiz-guess"
                onSubmit={(e: FormEvent) => {
                  e.preventDefault();
                  if (guess.trim()) answer(guess);
                  else guessInputRef.current?.focus();
                }}
              >
                <input
                  ref={guessInputRef}
                  type="text"
                  className={`quiz-guess-input ${
                    result ? (result.correct ? 'correct' : 'wrong') : ''
                  }`}
                  value={guess}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setGuess(e.target.value)}
                  disabled={revealed}
                  placeholder="Type the Pokémon’s name"
                  aria-label="Your guess"
                  enterKeyHint="done"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                />
                <div className="quiz-guess-actions">
                  <button type="submit" className="quiz-primary" disabled={revealed}>
                    Guess
                  </button>
                  <button
                    type="button"
                    className="quiz-secondary"
                    disabled={revealed}
                    onClick={() => answer(null)}
                  >
                    Give up
                  </button>
                </div>
              </form>
            ))}

          {revealed && round && (
            <div className="quiz-actions">
              <button
                ref={nextButtonRef}
                type="button"
                className="quiz-primary"
                onClick={nextRound}
              >
                Next Pokémon
              </button>
              <button
                type="button"
                className="quiz-secondary"
                onClick={() => onOpenPokemon(round.pokemon)}
              >
                View in Pokédex
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default WhosThatPokemon;
