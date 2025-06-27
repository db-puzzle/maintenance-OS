<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class TestEmail extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'email:test {email : The email address to send test email to}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send a test email to verify mail configuration';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $email = $this->argument('email');
        
        $this->info('Sending test email to: ' . $email);
        
        try {
            Mail::raw('This is a test email from your Laravel maintenance management system. If you received this, your email configuration is working correctly!', function ($message) use ($email) {
                $message->to($email)
                        ->subject('Test Email - ' . config('app.name'));
            });
            
            $this->info('✅ Test email sent successfully!');
            $this->info('Check your inbox (and spam folder) for the test email.');
            
            // Display current mail configuration (without sensitive data)
            $this->newLine();
            $this->info('Current mail configuration:');
            $this->table(
                ['Setting', 'Value'],
                [
                    ['Mailer', config('mail.default')],
                    ['Host', config('mail.mailers.smtp.host', 'N/A')],
                    ['Port', config('mail.mailers.smtp.port', 'N/A')],
                    ['Encryption', config('mail.mailers.smtp.encryption', 'N/A')],
                    ['From Address', config('mail.from.address')],
                    ['From Name', config('mail.from.name')],
                ]
            );
            
        } catch (\Exception $e) {
            $this->error('❌ Failed to send test email!');
            $this->error('Error: ' . $e->getMessage());
            
            $this->newLine();
            $this->warn('Common issues:');
            $this->warn('1. Check your .env mail configuration');
            $this->warn('2. For Gmail, use App Password, not regular password');
            $this->warn('3. Verify firewall allows outbound SMTP connections');
            $this->warn('4. Run: php artisan config:clear');
        }
        
        return 0;
    }
} 