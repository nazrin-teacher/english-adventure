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
    todo: 'Önce sınıftaki eşyalara dokunup adlarını dinler. Sonra dedektif görevleri: renk ipucuyla eşya bulma, benzer eşyalar arasından seçme, saklanan eşyayı tahmin etme ve kaybolan eşyayı bulma. En sonda eşyaları kendisi söyler.',
    say: '"It\'s a pencil." "It\'s an eraser." "They\'re scissors."',
    help: '"Kaybolan eşya" görevinde gözlerini kapatmasına eşlik edin. Evdeki gerçek eşyaları gösterip "What is it?" diye sorabilirsiniz.',
  },
  'its-a': {
    todo: 'Kızın okul eşyalarını keşfeder, sonra yönergeleri dinleyip doğru eşyayı bulur ve çantaya koyar (sürükleyerek ya da önce eşyaya sonra çantaya dokunarak). En sonda çantayı açıp içindekileri tanıtır.',
    say: '"Find the red book." "Put two pencils in the bag." → "It\'s a red book."',
    help: 'Renk ve sayılara dikkat etmesini isteyin (red/blue, two). Kendi okul çantasını birlikte hazırlarken aynı cümleleri kullanabilirsiniz.',
  },
  'school-object-hunt': {
    todo: 'Görev kartlarını çevirir, sonra evde istenen eşyayı gerçekten arar. Bulduğunda siz düğmeyi basılı tutarak onaylarsınız; çocuk "I found a book!" der ve eşya hazine rafına eklenir.',
    say: '"Find a book." → "I found a book!" "It\'s a book."',
    help: 'Onayı yalnızca eşyayı gerçekten gördüğünüzde verin; bulamazsa "Not this time" ile geçilebilir. Uygulama eşyayı kendisi kontrol etmez.',
  },
  'family-memory': {
    todo: 'Aileyle tanışır; sonra hafıza kartları, "kim kayıp?", dinleyip doğru kişiyi bulma ve aile resminde kişiyi bulma görevlerini yapar. En sonda aile üyelerini tanıtır.',
    say: '"This is my mum." "He\'s my grandpa." "She\'s my sister."',
    help: 'Kendi aile fotoğraflarınızı gösterip aynı cümleleri kurun (uygulamaya fotoğraf yüklenmez).',
  },
  'meet-my-family': {
    todo: 'Önce büyükannenin yüz ve vücut bölümlerine dokunur. Sonra ipuçlarını dinleyip kişiyi tahmin eder. En sonda bir kişiyi anlatır ve sizin tahmin etmeniz için ipucu verir.',
    say: 'hair, eyes, nose, mouth, ears, face, arms, body / "She\'s got curly hair." "He\'s got glasses."',
    help: 'Son bölümde çocuğunuz gizli kişiyi seçer ve ipuçlarını söyler; siz dinleyip doğru kişiye dokunun.',
  },
  'puppet-studio': {
    todo: 'Kuklalarla tanışır, söylenen kuklayı yapar (ör. gri kıvırcık saçlı büyükanne), sonra kendi kuklasını tasarlar. Kuklaları sahnede sıraya dizer ve gösteride her kuklayı tanıtır.',
    say: '"This is my grandma." "She\'s got curly grey hair." "She\'s got glasses."',
    help: 'Kukla sayfasını yazdırıp kesebilir, çubuğa yapıştırıp evde gösteri yapabilirsiniz.',
  },
  'which-animal': {
    todo: 'Hayvanlarla tanışır; sonra sesten, gölgeden, ipucundan, saklanan hayvandan ve ses eşleştirmeden doğru hayvanı bulur. En sonda hayvanları kendisi tanıtır.',
    say: 'cow, horse, pig, hen, sheep, duck / "It\'s a cow." "It\'s black and white."',
    help: 'Hayvan seslerini birlikte taklit edin; gölge turunda şekli birlikte tarif edin.',
  },
  'i-can-see': {
    todo: 'Dürbünü sürükleyerek çiftliği keşfeder, renk, büyüklük, bacak sayısı ve "yanında" ipuçlarıyla hayvan bulur, sonra seçtiği üç hayvan hakkında bir çiftlik raporu söyler.',
    say: '"I can see a horse." "It\'s brown." "It\'s big." "It\'s got four legs."',
    help: 'big = büyük, small = küçük, next to = yanında. Raporu birlikte tekrar dinleyebilirsiniz.',
  },
  'build-my-farm': {
    todo:
      'Önce çiftliği keşfeder, sonra hayvanları söylenen yere yerleştirir (sürükleyerek veya önce hayvana sonra yere dokunarak), hayvanları sayar ve en sonda kendi çiftliğini tasarlayıp anlatır.',
    say: '"Put the duck next to the cow." "I can see nine animals." "It\'s under the tree." "I\'m kind to animals."',
    help: 'next to = yanında, under = altında, on = üstünde, in = içinde. Sayarken parmakla birlikte sayın; çocuğunuzun kendi çiftliğini anlatmasına zaman tanıyın.',
  },
};
