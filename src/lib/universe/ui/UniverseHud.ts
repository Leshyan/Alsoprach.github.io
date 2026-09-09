export interface ArticleHudContent {
  theme: string;
  title: string;
  subtitle: string;
  opacity: number;
  hint: string;
}

export interface NebulaHudContent {
  title: string;
  subtitle: string;
  opacity: number;
}

export class UniverseHud {
  private readonly shell: HTMLElement;
  private readonly articleLabel: HTMLElement | null;
  private readonly articleTheme: HTMLElement | null;
  private readonly articleTitle: HTMLElement | null;
  private readonly articleSubtitle: HTMLElement | null;
  private readonly articleHint: HTMLElement | null;
  private readonly nebulaLabel: HTMLElement | null;
  private readonly nebulaTitle: HTMLElement | null;
  private readonly nebulaSubtitle: HTMLElement | null;
  private readonly flightHud: HTMLElement | null;
  private readonly crosshair: HTMLElement | null;
  private readonly cursorGlow: HTMLElement | null;
  private articleKey = '';
  private articleHintText = '';
  private nebulaKey = '';
  private flightOpacity = '';

  constructor(shell: HTMLElement) {
    this.shell = shell;
    this.articleLabel = shell.querySelector('#article-label');
    this.articleTheme = shell.querySelector('#article-label-theme');
    this.articleTitle = shell.querySelector('#article-label-title');
    this.articleSubtitle = shell.querySelector('#article-label-subtitle');
    this.articleHint = shell.querySelector('.article-label__hint');
    this.nebulaLabel = shell.querySelector('#nebula-label');
    this.nebulaTitle = shell.querySelector('#nebula-label-title');
    this.nebulaSubtitle = shell.querySelector('#nebula-label-subtitle');
    this.flightHud = shell.querySelector('#flight-hud');
    this.crosshair = shell.querySelector('#crosshair');
    this.cursorGlow = shell.querySelector('#cursor-glow');
  }

  setPointerPosition(x: number, y: number) {
    this.cursorGlow?.style.setProperty('--x', `${x}px`);
    this.cursorGlow?.style.setProperty('--y', `${y}px`);
  }

  setCursorGlowOpacity(opacity: number) {
    if (this.cursorGlow) this.cursorGlow.style.opacity = String(opacity);
  }

  showArticle(content: ArticleHudContent) {
    const key = `${content.theme}\u0000${content.title}\u0000${content.subtitle}`;
    if (key !== this.articleKey) {
      if (this.articleTheme) this.articleTheme.textContent = content.theme.toUpperCase();
      if (this.articleTitle) this.articleTitle.textContent = content.title;
      if (this.articleSubtitle) this.articleSubtitle.textContent = content.subtitle;
      this.articleKey = key;
    }
    if (content.hint !== this.articleHintText) {
      if (this.articleHint) this.articleHint.textContent = content.hint;
      this.articleHintText = content.hint;
    }
    if (this.articleLabel) {
      this.articleLabel.style.opacity = String(content.opacity);
      this.articleLabel.classList.toggle('is-visible', content.opacity > 0.12);
    }
  }

  hideArticle() {
    if (!this.articleLabel) return;
    this.articleLabel.style.opacity = '0';
    this.articleLabel.classList.remove('is-visible');
  }

  showNebula(content: NebulaHudContent) {
    const key = `${content.title}\u0000${content.subtitle}`;
    if (key !== this.nebulaKey) {
      if (this.nebulaTitle) this.nebulaTitle.textContent = content.title;
      if (this.nebulaSubtitle) this.nebulaSubtitle.textContent = content.subtitle;
      this.nebulaKey = key;
    }
    if (this.nebulaLabel) this.nebulaLabel.style.opacity = String(content.opacity);
  }

  hideNebula() {
    if (this.nebulaLabel) this.nebulaLabel.style.opacity = '0';
  }

  setFlightStatus(enabled: boolean, pointerLocked: boolean) {
    const opacity = enabled ? (pointerLocked ? '.58' : '.24') : '0';
    if (opacity === this.flightOpacity) return;
    if (this.flightHud) this.flightHud.style.opacity = opacity;
    if (this.crosshair) this.crosshair.style.opacity = enabled && pointerLocked ? '1' : '0';
    document.documentElement.dataset.pointerLocked = enabled && pointerLocked ? 'true' : 'false';
    this.flightOpacity = opacity;
  }

  setState(state: string) {
    document.documentElement.dataset.universeState = state;
    this.shell.dataset.universeState = state;
  }
}
