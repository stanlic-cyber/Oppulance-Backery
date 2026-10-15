import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, AlertTriangle } from 'lucide-react';

export const DeleteAccountDialog = () => {
  const { t } = useLanguage();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [open, setOpen] = useState(false);

  const handleDeleteAccount = async () => {
    if (!user || confirmText !== 'DELETE') return;

    setIsDeleting(true);
    try {
      // Delete user's data from related tables
      // The order matters due to foreign key constraints
      
      // Delete user's listings
      await supabase.from('listings').delete().eq('farmer_id', user.id);
      
      // Delete user's orders (as buyer)
      await supabase.from('orders').delete().eq('buyer_id', user.id);
      
      // Delete user's support tickets
      await supabase.from('support_tickets').delete().eq('user_id', user.id);
      
      // Delete user's notifications
      await supabase.from('notifications').delete().eq('user_id', user.id);
      
      // Delete user's driver profile if exists
      await supabase.from('driver_profiles').delete().eq('user_id', user.id);
      
      // Delete user's driver wallet if exists
      await supabase.from('driver_wallets').delete().eq('driver_id', user.id);
      
      // Delete user's driver location if exists
      await supabase.from('driver_locations').delete().eq('driver_id', user.id);
      
      // Delete user role
      await supabase.from('user_roles').delete().eq('user_id', user.id);
      
      // Delete user profile
      await supabase.from('profiles').delete().eq('id', user.id);

      // Sign out and navigate to home
      await signOut();
      
      toast({
        title: t('settings.accountDeleted'),
        description: t('settings.accountDeletedDesc'),
      });
      
      navigate('/');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: t('common.error'),
        description: t('common.tryAgain'),
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setOpen(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="w-full">
          <Trash2 className="h-4 w-4 mr-2" />
          {t('settings.deleteAccount')}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {t('settings.deleteAccountTitle')}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>{t('settings.deleteAccountWarning')}</p>
            <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
              <li>{t('settings.deleteWarning1')}</li>
              <li>{t('settings.deleteWarning2')}</li>
              <li>{t('settings.deleteWarning3')}</li>
            </ul>
            <div className="pt-2">
              <p className="text-sm font-medium mb-2">
                {t('settings.typeDeleteConfirm')}
              </p>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                className="font-mono"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            {t('common.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteAccount}
            disabled={confirmText !== 'DELETE' || isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? t('common.loading') : t('settings.deleteAccountConfirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
