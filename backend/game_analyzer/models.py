from django.db import models
from django.contrib.auth.models import User

# Create your models here.

class Game(models.Model):
    event = models.CharField(max_length=50)
    site = models.CharField(max_length=50)
    date = models.DateField()
    round = models.IntegerField(null=True, blank=True) # null if round is unknown (PGN uses "-" or "?")
    white_player = models.CharField(max_length=50) # e.g. "Magnus Carlsen"
    black_player = models.CharField(max_length=50) # e.g. "Hikaru Nakamura"
    result = models.CharField(max_length=10) # e.g. "1-0", "0-1", "1/2-1/2", "*"
    white_elo = models.IntegerField(null=True, blank=True) # null if ELO is unknown
    black_elo = models.IntegerField(null=True, blank=True) # null if ELO is unknown
    time_control = models.CharField(max_length=25) # e.g. "10+0" or "30/15"
    end_time = models.TimeField(null=True, blank=True)  
    termination = models.CharField(max_length=50) # e.g. "Time forfeit", "Draw by agreement", "Resignation"
    eco_code = models.CharField(max_length=10, blank=True) # e.g. "B90"
    fen_matches_array = models.JSONField(default=list, blank=True) # e.g. ["King's Pawn Game", "Sicilian Defense", "Sicilian Defense: Najdorf Variation"]
    opening_line = models.CharField(max_length=200, blank=True) # e.g. "King's Pawn Game: Sicilian Defense: Najdorf Variation"
    opening_family = models.CharField(max_length=200, blank=True) # e.g. "Sicilian Defense"
    moves = models.JSONField(default=list, blank=True) # structured move data with analysis info

    def __str__(self):
        return f"{self.white_player} vs {self.black_player} on {self.date}"

class ReportGame(models.Model):
    # 'Report' is a string because the Report class is defined below this one
    # in the file. Python reads top-to-bottom, so the name Report doesn't exist
    # yet. Django handles this with a model registry — when the app loads, it
    # registers every model class, then goes back and resolves all string
    # references to the actual classes. This is Django's official way to handle
    # forward references between models.
    report = models.ForeignKey('Report', on_delete=models.CASCADE)
    game = models.ForeignKey(Game, on_delete=models.CASCADE)
    outcome = models.CharField(max_length=10) # e.g. "win", "loss", "draw" 

    def __str__(self):
        return f"Report {self.report.id} - Game {self.game.id} - {self.outcome}"

class Report(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reports')
    report_name = models.CharField(max_length=100, default="")
    player_name = models.CharField(max_length=100, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    games = models.ManyToManyField(Game, through='ReportGame', related_name='reports', blank=True)
    total_games = models.IntegerField(default=0)
    wins = models.IntegerField(default=0)
    losses = models.IntegerField(default=0)
    draws = models.IntegerField(default=0)
    win_rate = models.FloatField(default=0.0)
    opening_family_count = models.IntegerField(default=0)
    opening_line_count = models.IntegerField(default=0)
    opening_family_stats = models.JSONField(default=dict, blank=True)
    opening_line_stats = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return self.report_name