#!/bin/sh

echo "$CONFIG_SSMTP" > /etc/ssmtp/ssmtp.conf
echo "$CONFIG_REVALIASES" > /etc/ssmtp/revaliases

chmod 644 /etc/ssmtp/ssmtp.conf

CMD="$@"

sleep 2

exec sudo -Eu nodejs $CMD
