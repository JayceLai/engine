import { GFXRenderPass, IGFXRenderPassInfo } from '../render-pass';
import { WebGLGPURenderPass } from './webgl-gpu-objects';
import { GFXStatus } from '../define';

export class WebGLGFXRenderPass extends GFXRenderPass {

    public get gpuRenderPass (): WebGLGPURenderPass {
        return  this._gpuRenderPass!;
    }

    private _gpuRenderPass: WebGLGPURenderPass | null = null;

    public initialize (info: IGFXRenderPassInfo): boolean {

        this._colorInfos = info.colorAttachments || [];
        this._depthStencilInfo = info.depthStencilAttachment || null;

        this._gpuRenderPass = {
            colorAttachments: this._colorInfos,
            depthStencilAttachment: this._depthStencilInfo,
        };

        this._status = GFXStatus.SUCCESS;

        return true;
    }

    public destroy () {
        this._gpuRenderPass = null;
        this._status = GFXStatus.UNREADY;
    }
}
