import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { Sun, Moon, Monitor, Globe } from 'lucide-react';
import { changeLanguage } from '@/lib/i18n';

function ProfileAvatar({ user }: { user: { name: string; avatar_url?: string } }) {
  const [imgError, setImgError] = useState(false);
  const showAvatar = user.avatar_url && !imgError;

  if (showAvatar) {
    return (
      <img
        src={user.avatar_url}
        alt={user.name}
        className="h-16 w-16 rounded-full object-cover"
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center">
      <span className="text-xl font-medium text-primary-foreground">
        {user.name?.charAt(0)?.toUpperCase() || 'U'}
      </span>
    </div>
  );
}

export function Settings() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <h1 className="text-3xl font-bold mb-8">{t('settings.title')}</h1>

      <div className="space-y-6">
        {/* Theme Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="h-5 w-5" />
              {t('settings.theme')}
            </CardTitle>
            <CardDescription>
              {t('settings.theme')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup value={theme} onValueChange={(value) => setTheme(value as 'light' | 'dark' | 'system')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="light" id="light" />
                <Label htmlFor="light" className="flex items-center gap-2 cursor-pointer">
                  <Sun className="h-4 w-4" />
                  {t('settings.light')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="dark" id="dark" />
                <Label htmlFor="dark" className="flex items-center gap-2 cursor-pointer">
                  <Moon className="h-4 w-4" />
                  {t('settings.dark')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="system" id="system" />
                <Label htmlFor="system" className="flex items-center gap-2 cursor-pointer">
                  <Monitor className="h-4 w-4" />
                  {t('settings.system')}
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Language Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              {t('settings.language')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={i18n.language}
              onValueChange={(value) => changeLanguage(value)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="hu" id="hu" />
                <Label htmlFor="hu" className="cursor-pointer">
                  {t('settings.hungarian')} 🇭🇺
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="en" id="en" />
                <Label htmlFor="en" className="cursor-pointer">
                  {t('settings.english')} 🇬🇧
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Profile Info */}
        {user && (
          <Card>
            <CardHeader>
              <CardTitle>{t('auth.profile')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <ProfileAvatar user={user} />
                <div>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
