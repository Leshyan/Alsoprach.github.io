export type UniverseState =
  | 'cover'
  | 'collapse'
  | 'bigbang'
  | 'cosmos'
  | 'article-enter'
  | 'article'
  | 'article-return';

const TRANSITIONS: Record<UniverseState, ReadonlySet<UniverseState>> = {
  cover: new Set(['collapse']),
  collapse: new Set(['bigbang']),
  bigbang: new Set(['cosmos']),
  cosmos: new Set(['article-enter']),
  'article-enter': new Set(['article']),
  article: new Set(['article-return']),
  'article-return': new Set(['cosmos']),
};

export class UniverseStateMachine {
  private current: UniverseState;
  private elapsed = 0;

  constructor(initial: UniverseState) {
    this.current = initial;
  }

  get state() {
    return this.current;
  }

  get stateElapsed() {
    return this.elapsed;
  }

  tick(deltaSeconds: number) {
    this.elapsed += Math.max(0, deltaSeconds);
  }

  canTransition(next: UniverseState) {
    return TRANSITIONS[this.current].has(next);
  }

  transition(next: UniverseState) {
    if (!this.canTransition(next)) {
      throw new Error(`Invalid universe transition: ${this.current} -> ${next}`);
    }
    this.current = next;
    this.elapsed = 0;
  }

  force(next: UniverseState) {
    this.current = next;
    this.elapsed = 0;
  }
}
