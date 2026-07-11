(() => {
  const legacyBase = "https://phainon-emberfall.opal-mint-9707.chatgpt.site/assets/";
  const localAssets = {
    "hell-battlefield.png": "/assets/backgrounds/hell-battlefield.png",
    "phainon-normal-v3.png": "/assets/characters/phainon-normal-v3.png",
    "phainon-god-v3.png": "/assets/characters/phainon-god-v3.png",
    "enemy-sprites-v2.png": "/assets/enemies/enemy-sprites-v2.png",
    "combat-vfx-v3.png": "/assets/effects/combat-vfx-v3.png",
  };

  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLImageElement.prototype,
    "src",
  );

  if (descriptor?.get && descriptor?.set) {
    Object.defineProperty(HTMLImageElement.prototype, "src", {
      configurable: descriptor.configurable,
      enumerable: descriptor.enumerable,
      get: descriptor.get,
      set(value) {
        const source = String(value ?? "");
        const fileName = source.startsWith(legacyBase)
          ? source.slice(legacyBase.length)
          : "";
        descriptor.set.call(this, localAssets[fileName] ?? source);
      },
    });
  }

  const nativeDrawImage = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function drawImageSafe(
    image,
    ...args
  ) {
    if (
      image instanceof HTMLImageElement &&
      (!image.complete || image.naturalWidth === 0 || image.naturalHeight === 0)
    ) {
      return;
    }
    return nativeDrawImage.call(this, image, ...args);
  };
})();
