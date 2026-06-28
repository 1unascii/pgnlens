from django.conf import settings
from django.db import models


class Game(models.Model):
    white = models.CharField(max_length=100)
    black = models.CharField(max_length=100)
    result = models.CharField(max_length=10)
    opening_family = models.CharField(
        max_length=200,
        blank=True,
    )
    opening_variation = models.CharField(
        max_length=200,
        blank=True,
    )
    opening_line = models.TextField(blank=True)
    eco_first_match = models.CharField(
        max_length=5,
        blank=True,
    )
    eco_last_match = models.CharField(
        max_length=5,
        blank=True,
    )
    moves = models.TextField()
    date = models.DateField(null=True, blank=True)

    def __str__(self):
        return f'{self.white} vs {self.black} ({self.result})'


class Report(models.Model):
    name = models.CharField(max_length=200)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
    )
    games = models.ManyToManyField(Game, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name
