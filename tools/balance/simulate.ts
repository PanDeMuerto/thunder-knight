// The economy simulator's report (GDD §11.2): gold at every break of every built battle, what a saving player buys,
// and the targets. Fails (exit 1) when a target breaks. Run after any price, gold or wave change.
//   npm run balance
import { LAST_READY } from '@/content/battles';
import { checkTargets, simulate } from '@/state/balance';

const report = simulate(LAST_READY);
console.log('battle  wave   gold  affordable  bought');
for (const b of report.breaks) {
  console.log(
    `${String(b.battle).padStart(6)}  ${String(b.wave).padStart(4)}  ${String(b.gold).padStart(5)}  ${(b.affordable ? 'yes' : 'NO').padStart(10)}  ${b.bought ?? '—'}`,
  );
}
console.log('\nearned per battle:', Object.entries(report.earned).map(([id, g]) => `B${id} ${g}`).join(', '));
const s = report.state;
console.log(`end: ${report.gold} gold; pistol ★${s.guns.pistol}, militia L${s.army.militia}, banner L${s.army.banner}, hero`, s.hero);
const failures = checkTargets(report);
for (const f of failures) console.log(`FAIL ${f}`);
console.log(failures.length ? `\n${failures.length} target(s) missed` : '\nAll balance targets met');
process.exit(failures.length ? 1 : 0);
