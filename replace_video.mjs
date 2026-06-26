import fs from 'fs';

const content = fs.readFileSync('src/components/features/main-menu/MainMenuScreen.tsx', 'utf-8');

const target = `{/* Menu Background */}
      {bgImage && (
        <div 
          className="absolute inset-0 z-0 pointer-events-none"
          style={{ 
            backgroundImage: \`url(\${bgImage})\`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'brightness(0.35)'
          }}
        />
      )}`;

const replacement = `{/* Menu Background */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-black">
        {bgImage ? (
          <div 
            className="absolute inset-0"
            style={{ 
              backgroundImage: \`url(\${bgImage})\`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'brightness(0.35)'
            }}
          />
        ) : (
          <video 
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000"
            autoPlay 
            loop 
            muted 
            playsInline
            style={{ filter: 'brightness(0.5)' }}
          >
            <source src="https://drive.google.com/uc?export=download&id=1bxQ6sVsO-H4vQ8_DcB8UZay4Dp8XwNjQ" type="video/mp4" />
          </video>
        )}
      </div>`;

if (content.includes(target)) {
  fs.writeFileSync('src/components/features/main-menu/MainMenuScreen.tsx', content.replace(target, replacement));
  console.log('Video background deployed.');
} else {
  console.log('Target block not found. Checking exactly what it is.');
  const lines = content.split('\n');
  const idx = lines.findIndex(l => l.includes('{/* Menu Background */}'));
  if (idx !== -1) {
    console.log(lines.slice(idx, idx+15).join('\n'));
  }
}
