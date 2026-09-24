/** Shared PokéAPI and app domain types. */

export interface NamedAPIResource {
  name: string;
  url: string;
}

export interface PokemonSprites {
  front_default: string | null;
  other?: {
    'official-artwork'?: {
      front_default?: string | null;
    };
  };
  [key: string]: unknown;
}

export interface PokemonTypeSlot {
  slot: number;
  type: NamedAPIResource;
}

export interface PokemonStat {
  base_stat: number;
  effort: number;
  stat: NamedAPIResource;
}

export interface PokemonAbility {
  is_hidden: boolean;
  slot: number;
  ability: NamedAPIResource;
}

export interface PokemonMove {
  move: NamedAPIResource;
}

/** Bare species ref on a raw /pokemon response. */
export interface SpeciesRef {
  name: string;
  url: string;
}

/** Expanded species resource (loaded via generation or species endpoint). */
export interface PokemonSpecies extends NamedAPIResource {
  id: number;
  evolution_chain?: { url: string };
  varieties?: Array<{ is_default: boolean; pokemon: NamedAPIResource }>;
  [key: string]: unknown;
}

export type PokemonSpeciesField = SpeciesRef | PokemonSpecies;

export interface Pokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  sprites: PokemonSprites;
  types: PokemonTypeSlot[];
  stats: PokemonStat[];
  abilities: PokemonAbility[];
  moves: PokemonMove[];
  species: PokemonSpeciesField;
  [key: string]: unknown;
}

export interface GenerationSummary {
  name: string;
  url: string;
}

export interface GenerationDetail {
  id: number;
  name: string;
  main_region: NamedAPIResource;
  pokemon_species: NamedAPIResource[];
}

/** App-enriched generation used throughout the UI. */
export interface Generation {
  id: number;
  name: string;
  displayName: string;
  region: string;
  speciesList: NamedAPIResource[];
}

export interface TypeDamageRelations {
  double_damage_from: NamedAPIResource[];
  double_damage_to: NamedAPIResource[];
  half_damage_from: NamedAPIResource[];
  half_damage_to: NamedAPIResource[];
  no_damage_from: NamedAPIResource[];
  no_damage_to: NamedAPIResource[];
}

export interface TypeResource {
  name: string;
  damage_relations: TypeDamageRelations;
  [key: string]: unknown;
}

export interface EvolutionDetail {
  min_level: number | null;
  trigger: NamedAPIResource;
  item: NamedAPIResource | null;
  [key: string]: unknown;
}

export interface ChainLink {
  species: NamedAPIResource;
  evolves_to: ChainLink[];
  evolution_details: EvolutionDetail[];
}

export interface EvolutionChain {
  id: number;
  chain: ChainLink;
}

export type AppView = 'browse' | 'favorites' | 'quiz' | 'settings';
export type SheetKind = 'filter' | 'generations';
export type ThemePreference = 'light' | 'dark' | 'system';
export type AppliedTheme = 'light' | 'dark';

export interface AppLocation {
  view: AppView;
  gen: string | null;
  pokemon: string | null;
  sheet: SheetKind | null;
  action?: string | null;
  index: number;
}

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastData {
  id: number;
  message: string;
  duration?: number;
  action?: ToastAction;
}

export interface InstallPromptState {
  canInstall: boolean;
  showIosHint: boolean;
  promptInstall: () => Promise<void>;
}

export interface ServiceWorkerUpdateState {
  updateAvailable: boolean;
  reload: () => void;
}
