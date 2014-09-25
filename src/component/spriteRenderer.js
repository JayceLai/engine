﻿var SpriteRenderer = (function () {

    var SpriteRenderer = FIRE.define('FIRE.SpriteRenderer', Renderer, function () {
        Renderer.call(this);
        RenderContext.initRenderer(this);
    });

    SpriteRenderer.prop('_sprite', null, FIRE.HideInInspector);
    SpriteRenderer.getset('sprite',
        function () {
            return this._sprite;
        },
        function (value) {
            this._sprite = value;
            Engine._renderContext.updateMaterial(this);
        },
        FIRE.ObjectType(FIRE.Sprite)
    );

    // built-in functions
    SpriteRenderer.prototype.onLoad = function () {
        Engine._renderContext.addSprite(this);
    };
    SpriteRenderer.prototype.onEnable = function () {
        Engine._renderContext.show(this, true);
    };
    SpriteRenderer.prototype.onDisable = function () {
        Engine._renderContext.show(this, false);
    };
    SpriteRenderer.prototype.onPreRender = function () {
        Engine._renderContext.updateTransform(this);
    };
    SpriteRenderer.prototype.onDestroy = function () {
        Engine._renderContext.remove(this);
    };
    //SpriteRenderer.prototype.onHierarchyChanged = function (transform, oldParent) {
    //    return Engine._renderContext.updateHierarchy(this, transform, oldParent);
    //};

    // other functions

    return SpriteRenderer;
})();

FIRE.SpriteRenderer = SpriteRenderer;
