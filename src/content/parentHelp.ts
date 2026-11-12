import type { GameId } from './games';

/**
 * Short guidance for grown-ups, in Turkish. Shown ONLY inside the grown-ups
 * panel (press-and-hold); child-facing screens stay English-only.
 */
export const GENERAL_HELP = [
  'Her yönerge İngilizce olarak sesli verilir; çocuğunuzun okuma bilmesi gerekmez.',
  'Hoparlör düğmesiyle cümleyi istediği kadar tekrar dinleyebilir.',
  'Cümleleri birlikte yüksek sesle söyleyin. Hata yapmak sorun değil, tekrar denenebilir.',
  'Mikrofon isteğe bağlıdır ve yalnızca ses çubuğunu gösterir; ses kaydedilmez, saklanmaz, gönderilmez. Telaffuz puanlanmaz.',
  'İlerleme yalnızca bu cihazda saklanır; ad, e-posta veya hesap gerekmez.',
];

export type GameHelp = { todo: string; say: string; help: string };

export const GAME_HELP: Record<GameId, GameHelp> = {
  'school-objects-match': {
    todo: 'Karakterin söylediği okul eşyasını bulup dokunur.',
    say: 'pencil, book, pen, chair… / "Find the pencil."',
    help: 'Eşyaların adını evdeki gerçek eşyaları göstererek birlikte söyleyin.',
  },
  'its-a': {
    todo: 'Eşyayı görür, cümleyi dinler ve tekrar eder.',
    say: '"It\'s a pencil." "It\'s an eraser."',
    help: 'Cümleyi birlikte söyleyin, sonra çocuğunuz "I said it!" düğmesine bassın.',
  },
  'school-object-hunt': {
    todo: 'Evde istenen eşyayı bulur, geri gelir ve ne bulduğunu söyler.',
    say: '"Find a book." → "I found a book!"',
    help: 'Aramaya eşlik edin; eşyayı bulduğunda onaylayıp "I found it!" düğmesine basın.',
  },
  'family-memory': {
    todo: 'Kartları çevirip aynı aile üyelerini eşleştirir.',
    say: 'mum, dad, grandma, grandpa, sister, brother',
    help: 'Açılan her kartın kelimesini birlikte tekrar edin.',
  },
  'meet-my-family': {
    todo: 'Aile üyelerine dokunur, cümleleri dinler ve tekrar eder.',
    say: '"She\'s my mum." "He\'s my dad." "She\'s got curly hair."',
    help: 'Kendi ailenizden örnekler verin: "She\'s my grandma!"',
  },
  'puppet-studio': {
    todo: 'Kukla seçer, saç, kıyafet ve yüz seçip kuklasını sahnede tanıtır.',
    say: '"This is my mum." "She\'s got curly hair."',
    help: 'Kukla sayfasını yazdırıp kesebilir, birlikte kukla gösterisi yapabilirsiniz.',
  },
  'which-animal': {
    todo: 'Hayvan sesini, gölgesini veya ipucunu dinleyip doğru hayvana dokunur.',
    say: 'cow, horse, pig, hen, sheep, duck',
    help: 'Hayvan seslerini birlikte taklit edin; hayvanın adını İngilizce söyleyin.',
  },
  'i-can-see': {
    todo: 'Çiftlikte gördüğü hayvanları İngilizce cümlelerle anlatır.',
    say: '"I can see a horse." "It\'s brown." "It\'s got four legs."',
    help: '"What can you see?" diye sorun; cevabı birlikte kurun.',
  },
  'build-my-farm': {
    todo:
      'Önce çiftliği keşfeder, sonra hayvanları söylenen yere yerleştirir (sürükleyerek veya önce hayvana sonra yere dokunarak), hayvanları sayar ve en sonda kendi çiftliğini tasarlayıp anlatır.',
    say: '"Put the duck next to the cow." "I can see nine animals." "It\'s under the tree." "I\'m kind to animals."',
    help: 'next to = yanında, under = altında, on = üstünde, in = içinde. Sayarken parmakla birlikte sayın; çocuğunuzun kendi çiftliğini anlatmasına zaman tanıyın.',
  },
};
