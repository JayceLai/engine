﻿//

/**
 * overridable callbacks for editor
 * @property {object} Fire.Engine._editorCallback
 * @private
 */
var editorCallback = {
    
    /**
     * @callback Fire.Engine._editorCallback~onEntityCreated
     * @param {Fire.Entity} entity
     */
    /**
     * @property {Fire.Engine._editorCallback~onEntityCreated} Fire.Engine._editorCallback.onEntityCreated
     */
    onEntityCreated: null,

    /**
     * removes a transform and all its children from scene
     * @callback Fire.Engine._editorCallback~onEntityRemoved
     * @param {Fire.Entity} entity
     */
    /**
     * @property {Fire.Engine._editorCallback~onEntityRemoved} Fire.Engine._editorCallback.onEntityRemoved
     */
    onEntityRemoved: null,

    /**
     * @callback Fire.Engine._editorCallback~onEntityParentChanged
     * @param {Fire.Entity} entity
     */
    /**
     * @property {Fire.Engine._editorCallback~onEntityParentChanged} Fire.Engine._editorCallback.onEntityParentChanged
     */
    onEntityParentChanged: null,
    
    /**
     * @callback Fire.Engine._editorCallback~onEntityIndexChanged
     * @param {Fire.Entity} entity
     * @param {number} oldIndex
     * @param {number} newIndex
     */
    /**
     * @property {Fire.Engine._editorCallback~onEntityIndexChanged} Fire.Engine._editorCallback.onEntityIndexChanged
     */
    onEntityIndexChanged: null,

    /**
     * @callback Fire.Engine._editorCallback~onEntityRenamed
     * @param {Fire.Entity} entity
     */
    /**
     * @property {Fire.Engine._editorCallback~onEntityRenamed} Fire.Engine._editorCallback.onEntityRenamed
     */
    onEntityRenamed: null,

    /**
     * @callback Fire.Engine._editorCallback~onSceneLaunched
     * @param {Scene} scene
     */
    /**
     * @property {Fire.Engine._editorCallback~onSceneLaunched} Fire.Engine._editorCallback.onSceneLaunched
     */
    onSceneLaunched: null,

    /**
     * @callback Fire.Engine._editorCallback~onSceneLoaded
     * @param {Scene} scene
     */
    /**
     * @property {Fire.Engine._editorCallback~onSceneLoaded} Fire.Engine._editorCallback.onSceneLoaded
     */
    onSceneLoaded: null,
};
