<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Você foi convidado para {{ config('app.name') }}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f4f4;">
        <tr>
            <td align="center" style="padding: 20px 0;">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; max-width: 600px; width: 100%;">
                    <!-- Header -->
                    <tr>
                        <td align="center" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); background-color: #667eea; padding: 40px 20px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">
                                {{ config('app.name') }}
                            </h1>
                            <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">
                                Gerenciamento simples para produtos complexos.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="font-size: 24px; font-weight: 600; color: #333333; margin: 0 0 20px 0;">Olá!</h2>
                            
                            <p style="font-size: 16px; line-height: 24px; color: #555555; margin: 0 0 20px 0;">
                                Você foi convidado por <strong>{{ $inviterName }}</strong> para entrar no sistema de gerenciamento de manufatura StreamLine-OS.
                            </p>
                            
                            @if(!empty($roleDisplayList))
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 20px 0;">
                                <tr>
                                    <td style="background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 20px;">
                                        <p style="font-size: 14px; color: #666666; margin: 0 0 10px 0;">{{ count($roleDisplayList) > 1 ? 'Funções atribuídas:' : 'Função atribuída:' }}</p>
                                        @foreach($roleDisplayList as $roleDisplay)
                                        <p style="font-size: 16px; font-weight: 600; color: #333333; margin: 0 0 8px 0;">• {{ ucfirst($roleDisplay) }}</p>
                                        @endforeach
                                    </td>
                                </tr>
                            </table>
                            @endif
                            
                            @if($invitation->message)
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 20px 0;">
                                <tr>
                                    <td style="background-color: #f8f9fa; border-left: 4px solid #764ba2; padding: 20px;">
                                        <p style="font-size: 14px; color: #666666; margin: 0 0 5px 0;">Mensagem pessoal de {{ $inviterName }} para você:</p>
                                        <p style="font-size: 16px; font-weight: normal; font-style: italic; color: #333333; margin: 0;">
                                            "{{ $invitation->message }}"
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            @endif
                            
                            <p style="font-size: 16px; line-height: 24px; color: #555555; margin: 20px 0;">
                                Click no botão abaixo para aceitar seu convite e criar sua conta:
                            </p>
                            
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="{{ $acceptUrl }}" style="display: inline-block; padding: 14px 30px; background-color: #667eea; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: 600; font-size: 16px;">
                                            Aceitar Convite
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="font-size: 14px; color: #999999; text-align: center; margin: 20px 0;">
                                Esse convite expira em <strong>{{ $invitation->expires_at->format('F j, Y \à\s H:i') }}</strong>
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e5e5e5;">
                            <p style="font-size: 14px; color: #666666; line-height: 20px; margin: 0 0 20px 0;">
                                Se você não esperava receber este convite, você pode ignorar este email.
                            </p>
                            <p style="font-size: 14px; color: #666666; line-height: 20px; margin: 0;">
                                &copy; {{ date('Y') }} {{ config('app.name') }}. Todos os direitos reservados.
                            </p>
                            @if(config('app.url'))
                            <p style="font-size: 14px; color: #666666; line-height: 20px; margin: 10px 0 0 0;">
                                <a href="{{ config('app.url') }}" style="color: #667eea; text-decoration: none;">Visite nosso site</a>
                            </p>
                            @endif
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>