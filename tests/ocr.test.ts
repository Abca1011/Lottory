import {expect,it} from 'vitest';
import {recognizeLocal} from '../server/ocr';

it('terminates stalled OCR and rejects without crashing the server',async()=>{
 await expect(recognizeLocal(Buffer.from('test'),'reference/ocr-cache',1)).rejects.toThrow('OCR timed out');
});
