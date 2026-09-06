from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("aiproxy", "0001_initial"),
    ]

    operations = [
        migrations.AlterModelOptions(
            name="airequestlog",
            options={
                "ordering": ["-created_at"],
                "verbose_name": "AI request log",
                "verbose_name_plural": "AI request logs",
            },
        ),
        migrations.AlterField(
            model_name="airequestlog",
            name="model",
            field=models.CharField(max_length=100, verbose_name="AI model"),
        ),
    ]
