/*
 Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
 worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
 not use Cocos Creator software for developing other software or tools that's
 used for developing games. You are not granted to publish, distribute,
 sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
*/

/**
 * @category ui-assembler
 */

import { BitmapFont } from '../../../core/assets';
import { LabelComponent} from '../../components';
import { IAssemblerManager } from '../../../core/renderer/ui/base';
import { bmfont } from './bmfont';
import { CanvasPool } from './font-utils';
import { letter } from './letter';
import { ttf } from './ttf';
import { sys } from '../../../core/platform/sys';
import { warn } from '../../../core/platform/debug';

const labelAssembler: IAssemblerManager = {
    getAssembler (comp: LabelComponent) {
        let assembler = ttf;

        if (comp.font instanceof BitmapFont) {
            assembler = bmfont;
        }else if (comp.cacheMode === LabelComponent.CacheMode.CHAR){
            if (sys.browserType === sys.BROWSER_TYPE_WECHAT_GAME_SUB){
                warn('sorry, subdomain does not support CHAR mode currently!');
            } else {
                assembler = letter;
            }
        }

        return assembler;
    },

    // Skip invalid labels (without own _assembler)
    // updateRenderData(label) {
    //     return label.__allocedDatas;
    // }
};

export {
    labelAssembler,
    ttf,
    bmfont,
    letter,
    CanvasPool,
};

LabelComponent.Assembler = labelAssembler;
