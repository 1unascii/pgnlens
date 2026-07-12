from django.contrib import admin

# Register your models here.
from .models import Game, Move, Report, ReportGame

class GameAdmin(admin.ModelAdmin):
    list_display = ('white_player', 'black_player', 'result', 'date', 'time_control', 'end_time', 'termination')
    search_fields = ('white_player', 'black_player', 'result', 'date', 'time_control', 'end_time', 'termination')
    list_filter = ('result', 'date', 'time_control', 'end_time', 'termination')

class MoveAdmin(admin.ModelAdmin):
    list_display = ('game', 'move_number', 'white_move', 'black_move', 'evaluation')
    search_fields = ('game', 'move_number', 'white_move', 'black_move', 'evaluation')
    list_filter = ('game', 'move_number', 'white_move', 'black_move', 'evaluation')

class ReportAdmin(admin.ModelAdmin):
    list_display = ('report_name', 'player_name', 'user', 'created_at')
    search_fields = ('report_name', 'player_name')
    list_filter = ('user', 'created_at')

class ReportGameAdmin(admin.ModelAdmin):
    list_display = ('report', 'game', 'outcome')
    list_filter = ('outcome',)

admin.site.register(Game, GameAdmin)
admin.site.register(Move, MoveAdmin)
admin.site.register(Report, ReportAdmin)
admin.site.register(ReportGame, ReportGameAdmin)