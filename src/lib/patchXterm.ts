import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';

const DEFAULT_DIMENSIONS = {
  css: {
    canvas: { width: 800, height: 400 },
    cell: { width: 9, height: 18 }
  },
  device: {
    canvas: { width: 800, height: 400 },
    cell: { width: 9, height: 18 },
    char: { width: 9, height: 18, left: 0, top: 0 }
  }
};

if (typeof window !== 'undefined') {
  // 1. Bulletproof xterm RenderService prototype so accessing .dimensions NEVER throws
  try {
    const dummy = new Terminal();
    const core = (dummy as any)._core;
    const renderService = core?._renderService;
    if (renderService) {
      const proto = Object.getPrototypeOf(renderService);
      if (proto && !(proto as any)._dimensionsPatched) {
        Object.defineProperty(proto, 'dimensions', {
          get() {
            try {
              if (this._renderer && this._renderer.value && this._renderer.value.dimensions) {
                return this._renderer.value.dimensions;
              }
            } catch (_) {}
            return DEFAULT_DIMENSIONS;
          },
          configurable: true,
          enumerable: true
        });
        (proto as any)._dimensionsPatched = true;
      }
    }
    dummy.dispose();
  } catch (err) {
    console.warn('[patchXterm] RenderService patch warning:', err);
  }

  // 2. Bulletproof FitAddon prototype so proposeDimensions and fit NEVER throw
  if (FitAddon && FitAddon.prototype) {
    FitAddon.prototype.proposeDimensions = function (this: any) {
      try {
        const t = this._terminal;
        if (!t || t._isDisposed) return undefined;
        const el = t.element;
        const parent = el ? el.parentElement : null;
        if (!el || !parent) return undefined;

        const parentStyle = window.getComputedStyle(parent);
        const parentHeight = parseInt(parentStyle.getPropertyValue('height')) || parent.clientHeight || parent.offsetHeight || 400;
        const parentWidth = Math.max(0, parseInt(parentStyle.getPropertyValue('width')) || parent.clientWidth || parent.offsetWidth || 800);

        const elStyle = window.getComputedStyle(el);
        const paddingTop = parseInt(elStyle.getPropertyValue('padding-top')) || 0;
        const paddingBottom = parseInt(elStyle.getPropertyValue('padding-bottom')) || 0;
        const paddingLeft = parseInt(elStyle.getPropertyValue('padding-left')) || 0;
        const paddingRight = parseInt(elStyle.getPropertyValue('padding-right')) || 0;

        const core = t._core;
        const scrollBarWidth = (t.options && t.options.scrollback === 0) ? 0 : (core?.viewport?.scrollBarWidth || 0);

        const availableHeight = Math.max(0, parentHeight - (paddingTop + paddingBottom));
        const availableWidth = Math.max(0, parentWidth - (paddingLeft + paddingRight) - scrollBarWidth);

        let cellWidth = 0;
        let cellHeight = 0;

        try {
          const rs = core?._renderService;
          if (rs && typeof rs.hasRenderer === 'function' && rs.hasRenderer()) {
            const dims = rs.dimensions;
            if (dims && dims.css && dims.css.cell) {
              cellWidth = dims.css.cell.width;
              cellHeight = dims.css.cell.height;
            }
          }
        } catch (_) {}

        const fontSize = (t.options && t.options.fontSize) ? t.options.fontSize : 14;
        if (!cellWidth || cellWidth <= 0 || isNaN(cellWidth)) {
          cellWidth = fontSize * 0.605;
        }
        if (!cellHeight || cellHeight <= 0 || isNaN(cellHeight)) {
          cellHeight = fontSize * 1.2;
        }

        const cols = Math.max(10, Math.floor(availableWidth / cellWidth));
        const rows = Math.max(4, Math.floor(availableHeight / cellHeight));

        if (isNaN(cols) || isNaN(rows) || cols <= 0 || rows <= 0) {
          return { cols: 80, rows: 24 };
        }

        return { cols, rows };
      } catch (e) {
        return { cols: 80, rows: 24 };
      }
    };

    FitAddon.prototype.fit = function (this: any) {
      try {
        const t = this._terminal;
        if (!t || t._isDisposed || !t.element || !t.element.parentElement) return;
        const proposed = this.proposeDimensions();
        if (!proposed || !proposed.cols || !proposed.rows || isNaN(proposed.cols) || isNaN(proposed.rows)) return;
        if (t.rows !== proposed.rows || t.cols !== proposed.cols) {
          const core = t._core;
          if (core?._renderService && typeof core._renderService.clear === 'function') {
            try {
              if (typeof core._renderService.hasRenderer === 'function' && core._renderService.hasRenderer()) {
                core._renderService.clear();
              }
            } catch (_) {}
          }
          t.resize(proposed.cols, proposed.rows);
        }
      } catch (e) {
        // Safe failover
      }
    };
  }

  // 3. Mark terminal as disposed so any asynchronous callbacks bail out immediately
  if (Terminal && Terminal.prototype) {
    const origDispose = Terminal.prototype.dispose;
    Terminal.prototype.dispose = function (this: any) {
      try {
        this._isDisposed = true;
      } catch (_) {}
      return origDispose.call(this);
    };
  }
}
