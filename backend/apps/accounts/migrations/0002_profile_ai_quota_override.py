from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="profile",
            name="ai_quota_override",
            field=models.PositiveIntegerField(
                blank=True,
                null=True,
                help_text=(
                    "Monthly AI-generation limit for this user specifically. "
                    "Leave blank to use the app-wide default (MONTHLY_AI_GENERATIONS_LIMIT). "
                    "Set to 0 to block AI generations for this user entirely."
                ),
            ),
        ),
    ]
