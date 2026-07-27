import {describe,expect,it} from 'vitest';
import {canApprove} from './validation';
describe('approval gate',()=>{
  it('requires a validated image and exactly ten active differences',()=>{
    expect(canApprove('passed',10,true)).toBe(true);
    expect(canApprove('passed',9,true)).toBe(false);
    expect(canApprove('failed',10,true)).toBe(false);
    expect(canApprove('passed',10,false)).toBe(false);
  });
});
