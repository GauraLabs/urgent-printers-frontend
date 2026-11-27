import {afterEach,describe,expect,it,vi} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import {FooterLinkGroup} from '@/components/layout/FooterLinkGroup';

afterEach(()=>{cleanup();vi.restoreAllMocks();});

describe('admin-managed navigation identities',()=>{
  it('keeps separate records when their labels and destinations match, then one is renamed and reordered',()=>{
    const errors=vi.spyOn(console,'error').mockImplementation(()=>{});
    const links=[{id:'41',label:'Order Help',href:'/faq'},{id:'42',label:'Order Help',href:'/faq'}];
    const {rerender}=render(<FooterLinkGroup title="Products" links={links}/>);
    expect(screen.getAllByRole('link',{name:'Order Help'})).toHaveLength(2);
    rerender(<FooterLinkGroup title="Products" links={[{...links[1],label:'Contact Support',href:'/contact'},links[0]]}/>);
    expect(screen.getAllByRole('link').map(link=>link.getAttribute('href'))).toEqual(['/contact','/faq']);
    expect(screen.getByRole('link',{name:'Contact Support'})).toBeInTheDocument();
    expect(errors.mock.calls.some(args=>String(args[0]).includes('same key'))).toBe(false);
  });
});
