// src/components/UsernamePrompt.tsx
'use client';

export default function UsernamePrompt({
  wallet,
  onRecheck,
}: {
  wallet: string;
  onRecheck: () => void;
}) {
  const claimUrl = 'https://monad-games-id-site.vercel.app/';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded bg-white p-5 shadow-lg">
        <h3 className="text-lg font-semibold mb-2">Kullanıcı Adı Gerekli</h3>
        <p className="text-sm text-gray-700 mb-4">
          Bu oyunu oynamak için Monad Games ID hesabında bir <b>kullanıcı adı</b> gereklidir.
          Aşağıdaki bağlantı ile kullanıcı adını oluştur veya bağla. İşlemi tamamladıktan sonra
          “Tekrar kontrol et”e bas.
        </p>

        <div className="text-xs text-gray-600 mb-3">
          Cüzdan: <span className="font-mono">{wallet}</span>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={claimUrl}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 rounded bg-blue-600 text-white"
          >
            Kullanıcı adını al
          </a>
          <button
            onClick={onRecheck}
            className="px-3 py-2 rounded border"
            title="Kaydı tamamladıysan tıkla"
          >
            Tekrar kontrol et
          </button>
        </div>

        <p className="mt-3 text-xs text-gray-500">
          Not: Kullanıcı adını kaydettikten sonra bu pencereyi kapatmak için “Tekrar kontrol et”e bas.
        </p>
      </div>
    </div>
  );
}
