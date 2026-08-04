import { useEffect, type RefObject } from 'react';

/**
 * 多区域按比例联动滚动：任一区域滚动，其余区域按相同滚动比例（scrollTop / 可滚动距离）
 * 跟随。用于「富文本区 / Markdown 区 / 预览区」三栏同步定位。
 *
 * - 用 isSyncing 标志 + requestAnimationFrame 复位，阻断「设 scrollTop → 触发对方 scroll → 再设」的回环。
 * - enabledRef.current=false 时（如正在流式生成、预览自动滚底）暂停联动，避免带动其它区。
 */
export function useScrollSync(
  refs: RefObject<HTMLElement | null>[],
  enabledRef: RefObject<boolean>
) {
  useEffect(() => {
    const els = refs.map((r) => r.current).filter(Boolean) as HTMLElement[];
    if (els.length < 2) return;

    let isSyncing = false;

    const handler = (e: Event) => {
      if (!enabledRef.current || isSyncing) return;
      const target = e.target as HTMLElement;
      const denom = target.scrollHeight - target.clientHeight;
      const ratio = denom > 0 ? target.scrollTop / denom : 0;

      isSyncing = true;
      els.forEach((el) => {
        if (el === target) return;
        const max = el.scrollHeight - el.clientHeight;
        if (max > 0) el.scrollTop = ratio * max;
      });
      requestAnimationFrame(() => {
        isSyncing = false;
      });
    };

    els.forEach((el) => el.addEventListener('scroll', handler, { passive: true }));
    return () => {
      els.forEach((el) => el.removeEventListener('scroll', handler));
    };
    // 仅在挂载时绑定一次；各 ref 通过 .current 实时读取，无需列入依赖。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
